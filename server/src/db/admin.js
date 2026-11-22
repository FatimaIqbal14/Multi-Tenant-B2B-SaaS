import pg from 'pg';
import { env } from '../config/env.js';

// Owner/superuser pool. ONLY for migrations, seed and the isolation test. Never import in routes.
export const adminPool = new pg.Pool({ connectionString: env.DATABASE_ADMIN_URL, max: 3 });
