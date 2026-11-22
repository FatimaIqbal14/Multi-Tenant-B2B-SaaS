import { env } from './config/env.js';
import { app } from './app.js';
import { pool } from './db/pool.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.PORT}  (${env.NODE_ENV})`);
});

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
