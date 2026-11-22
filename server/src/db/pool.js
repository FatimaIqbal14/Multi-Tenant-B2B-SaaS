import pg from 'pg';
import { env } from '../config/env.js';

// Runtime pool: connects as the restricted `app_user` role. RLS applies to every query.
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });

/**
 * Run `fn` inside a transaction scoped to ONE tenant.
 * set_config(..., true) makes the setting transaction-local, so it can never leak to
 * the next request that happens to reuse this pooled connection.
 */
export async function withTenant(tenantId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Slug -> { id, name, slug } or null, via the SECURITY DEFINER function (no tenant context needed). */
export async function resolveTenant(slug) {
  const { rows } = await pool.query('SELECT id, name, slug FROM resolve_tenant($1)', [slug]);
  return rows[0] ?? null;
}
