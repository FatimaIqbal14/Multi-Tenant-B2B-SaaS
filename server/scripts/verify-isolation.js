// Proves, against the real database, that Row-Level Security isolates tenants.
// Run: npm run test:isolation   (requires migrated + seeded database)
import assert from 'node:assert/strict';
import { pool, withTenant } from '../src/db/pool.js';
import { adminPool } from '../src/db/admin.js';

const results = [];
async function check(name, fn) {
  try { await fn(); results.push([true, name]); console.log(`  ✔ ${name}`); }
  catch (e) { results.push([false, name]); console.log(`  ✘ ${name}\n      ${e.message}`); }
}

const { rows: tenants } = await adminPool.query('SELECT id, slug FROM tenants ORDER BY slug LIMIT 2');
assert.equal(tenants.length, 2, 'Need at least 2 seeded tenants. Run `npm run seed` first.');
const [A, B] = tenants;
console.log(`\nTenant A = ${A.slug}\nTenant B = ${B.slug}\n`);

await check('runtime role is not a superuser and cannot bypass RLS', async () => {
  const { rows } = await pool.query(
    'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
  assert.equal(rows[0].rolsuper, false);
  assert.equal(rows[0].rolbypassrls, false);
});

await check('no tenant context => zero rows in every table', async () => {
  for (const t of ['tenants', 'roles', 'users', 'bookings', 'password_reset_tokens']) {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${t}`);
    assert.equal(rows[0].n, 0, `${t} leaked ${rows[0].n} rows`);
  }
});

await check('tenant A only sees its own bookings, users and roles', async () => {
  await withTenant(A.id, async (db) => {
    for (const t of ['bookings', 'users', 'roles']) {
      const { rows } = await db.query(`SELECT DISTINCT tenant_id FROM ${t}`);
      assert.deepEqual(rows.map((r) => r.tenant_id), [A.id], `${t} contains foreign rows`);
    }
    const { rows } = await db.query('SELECT id FROM tenants');
    assert.deepEqual(rows.map((r) => r.id), [A.id]);
  });
});

await check('explicit WHERE tenant_id = B still returns nothing from A’s context', async () => {
  await withTenant(A.id, async (db) => {
    const { rowCount } = await db.query('SELECT * FROM bookings WHERE tenant_id = $1', [B.id]);
    assert.equal(rowCount, 0);
  });
});

await check('A cannot INSERT a booking into B (policy violation)', async () => {
  const { rows: [bUser] } = await adminPool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [B.id]);
  await assert.rejects(
    withTenant(A.id, (db) => db.query(
      `INSERT INTO bookings (tenant_id, created_by, title, client_name, starts_at, ends_at)
       VALUES ($1,$2,'hack','x', now(), now() + interval '1 hour')`, [B.id, bUser.id])),
    (e) => e.code === '42501');
});

await check('A cannot UPDATE or DELETE B’s rows (0 rows affected)', async () => {
  await withTenant(A.id, async (db) => {
    const u = await db.query("UPDATE bookings SET title = 'pwned' WHERE tenant_id = $1", [B.id]);
    const d = await db.query('DELETE FROM bookings WHERE tenant_id = $1', [B.id]);
    assert.equal(u.rowCount + d.rowCount, 0);
  });
});

await check('composite FK blocks a booking owned by A but created by B’s user', async () => {
  const { rows: [bUser] } = await adminPool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [B.id]);
  await assert.rejects(
    withTenant(A.id, (db) => db.query(
      `INSERT INTO bookings (tenant_id, created_by, title, client_name, starts_at, ends_at)
       VALUES ($1,$2,'cross','x', now(), now() + interval '1 hour')`, [A.id, bUser.id])),
    (e) => e.code === '23503');
});

await check('tenant context does not leak between pooled connections', async () => {
  await withTenant(A.id, (db) => db.query('SELECT 1'));
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM bookings');
  assert.equal(rows[0].n, 0);
});

const failed = results.filter(([ok]) => !ok).length;
console.log(failed ? `\n${failed} check(s) FAILED\n` : `\nAll ${results.length} isolation checks passed ✅\n`);
await pool.end(); await adminPool.end();
process.exit(failed ? 1 : 0);
