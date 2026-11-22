import crypto from 'node:crypto';
import { asyncRouter } from '../lib/asyncRouter.js';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool, withTenant, resolveTenant } from '../db/pool.js';
import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';
import { validate } from '../middleware/validate.js';
import { COOKIE, issueSession, requireAuth } from '../middleware/auth.js';
import {
  onboardSchema, registerSchema, loginSchema, forgotSchema, resetSchema,
} from '../lib/schemas.js';

const router = asyncRouter();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // equalises timing when user is unknown

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

async function requireTenant(slug) {
  const tenant = await resolveTenant(slug);
  if (!tenant) throw new HttpError(404, 'We couldn’t find that organization.', { slug: 'No organization with this address' });
  return tenant;
}

// ------------------------------------------------------------ onboarding
router.post('/onboard', limiter, validate(onboardSchema), async (req, res) => {
  const { orgName, slug, name, email, password } = req.body;
  if (await resolveTenant(slug)) throw new HttpError(409, 'That address is taken.', { slug: 'That address is already taken' });

  const tenantId = crypto.randomUUID();           // pick the id first so RLS context exists for the INSERT
  const hash = await bcrypt.hash(password, 10);

  const user = await withTenant(tenantId, async (db) => {
    await db.query('INSERT INTO tenants (id, name, slug) VALUES ($1,$2,$3)', [tenantId, orgName, slug]);
    const roleIds = {};
    for (const [roleName, description] of [
      ['owner', 'Full access, billing and organization settings'],
      ['admin', 'Manage bookings, team members and settings'],
      ['member', 'Create and edit bookings'],
    ]) {
      const r = await db.query('INSERT INTO roles (tenant_id, name, description) VALUES ($1,$2,$3) RETURNING id',
        [tenantId, roleName, description]);
      roleIds[roleName] = r.rows[0].id;
    }
    const u = await db.query(
      `INSERT INTO users (tenant_id, role_id, email, name, password_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, tenant_id, name, email`,
      [tenantId, roleIds.owner, email, name, hash]);
    return { ...u.rows[0], role: 'owner' };
  });

  issueSession(res, user);
  res.status(201).json({ user: publicUser(user), tenant: { id: tenantId, name: orgName, slug } });
});

// -------------------------------------------------------------- register
router.post('/register', limiter, validate(registerSchema), async (req, res) => {
  const { slug, name, email, password } = req.body;
  const tenant = await requireTenant(slug);
  const hash = await bcrypt.hash(password, 10);

  const user = await withTenant(tenant.id, async (db) => {
    const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount) throw new HttpError(409, 'That email is already registered.', { email: 'This email already has an account' });
    const role = await db.query("SELECT id FROM roles WHERE name = 'member'");
    const u = await db.query(
      `INSERT INTO users (tenant_id, role_id, email, name, password_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, tenant_id, name, email`,
      [tenant.id, role.rows[0].id, email, name, hash]);
    return { ...u.rows[0], role: 'member' };
  });

  issueSession(res, user);
  res.status(201).json({ user: publicUser(user), tenant });
});

// ----------------------------------------------------------------- login
router.post('/login', limiter, validate(loginSchema), async (req, res) => {
  const { slug, email, password } = req.body;
  const tenant = await resolveTenant(slug);

  const user = tenant && await withTenant(tenant.id, async (db) => {
    const r = await db.query(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.is_active, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
        WHERE u.email = $1`, [email]);
    return r.rows[0];
  });

  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!tenant || !user || !ok || !user.is_active) {
    // One message for every failure, so attackers can't tell which part was wrong.
    throw new HttpError(401, 'Email, password or organization is incorrect.');
  }

  await withTenant(tenant.id, (db) => db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]));
  issueSession(res, user);
  res.json({ user: publicUser(user), tenant });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE);
  res.status(204).end();
});

// -------------------------------------------------------------------- me
router.get('/me', requireAuth, async (req, res) => {
  const { tenantId, userId } = req.auth;
  const data = await withTenant(tenantId, async (db) => {
    const u = await db.query(
      `SELECT u.id, u.name, u.email, r.name AS role FROM users u
         JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id WHERE u.id = $1`, [userId]);
    const t = await db.query('SELECT id, name, slug, plan, timezone FROM tenants');
    return { user: u.rows[0], tenant: t.rows[0] };
  });
  if (!data.user) throw new HttpError(401, 'Please sign in to continue.');
  res.json(data);
});

// --------------------------------------------------------- password reset
router.post('/forgot-password', limiter, validate(forgotSchema), async (req, res) => {
  const { slug, email } = req.body;
  const tenant = await resolveTenant(slug);

  if (tenant) {
    await withTenant(tenant.id, async (db) => {
      const u = await db.query('SELECT id FROM users WHERE email = $1 AND is_active', [email]);
      if (!u.rowCount) return;
      const token = crypto.randomBytes(32).toString('hex');
      await db.query(
        `INSERT INTO password_reset_tokens (tenant_id, user_id, token_hash, expires_at)
         VALUES ($1,$2,$3, now() + interval '1 hour')`, [tenant.id, u.rows[0].id, sha256(token)]);
      // Week 1: no email provider yet, so we print the link. Later weeks can plug in SMTP.
      console.log(`\n🔑 Password reset link for ${email}:\n   ${env.CLIENT_ORIGIN}/reset-password?org=${slug}&token=${token}\n`);
    });
  }
  // Same response whether or not the account exists (prevents account enumeration).
  res.json({ message: 'If that account exists, a reset link is on its way.' });
});

router.post('/reset-password', limiter, validate(resetSchema), async (req, res) => {
  const { slug, token, password } = req.body;
  const tenant = await requireTenant(slug);
  const hash = await bcrypt.hash(password, 10);

  await withTenant(tenant.id, async (db) => {
    const t = await db.query(
      `UPDATE password_reset_tokens SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`, [sha256(token)]);
    if (!t.rowCount) throw new HttpError(400, 'This reset link is invalid or has expired.');
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, t.rows[0].user_id]);
  });

  res.json({ message: 'Password updated. You can sign in now.' });
});

export default router;
