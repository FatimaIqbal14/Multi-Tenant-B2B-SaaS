import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminPool } from './admin.js';
import { env } from '../config/env.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function ensureAppRole(client) {
  const pw = client.escapeLiteral(env.APP_DB_PASSWORD);
  const { rowCount } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'app_user'");
  if (rowCount) {
    await client.query(`ALTER ROLE app_user WITH LOGIN PASSWORD ${pw} NOSUPERUSER NOBYPASSRLS`);
  } else {
    await client.query(`CREATE ROLE app_user WITH LOGIN PASSWORD ${pw} NOSUPERUSER NOBYPASSRLS`);
  }
}

async function main() {
  const client = await adminPool.connect();
  try {
    await ensureAppRole(client);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✔ applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    console.log('Migrations up to date.');
  } finally {
    client.release();
    await adminPool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
