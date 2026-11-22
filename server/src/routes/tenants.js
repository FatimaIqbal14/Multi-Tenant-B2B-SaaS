import { asyncRouter } from '../lib/asyncRouter.js';
import { resolveTenant } from '../db/pool.js';
import { slug as slugSchema } from '../lib/schemas.js';

const router = asyncRouter();

// Live availability check for the onboarding form.
router.get('/slug-available/:slug', async (req, res) => {
  const parsed = slugSchema.safeParse(req.params.slug);
  if (!parsed.success) return res.json({ available: false, reason: parsed.error.issues[0].message });
  res.json({ available: !(await resolveTenant(parsed.data)) });
});

// Lets the login screen show "Signing in to Brightside Dental" for a subdomain.
router.get('/resolve/:slug', async (req, res) => {
  const tenant = await resolveTenant(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Organization not found.' });
  res.json({ name: tenant.name, slug: tenant.slug });
});

export default router;
