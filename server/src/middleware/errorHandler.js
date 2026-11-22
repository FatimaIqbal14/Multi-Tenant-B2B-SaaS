import { HttpError } from '../lib/httpError.js';
import { env } from '../config/env.js';

export function notFound(_req, _res, next) { next(new HttpError(404, 'Route not found.')); }

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.fields });
  }
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({ error: 'That value is already in use.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.', ...(env.NODE_ENV !== 'production' && { detail: err.message }) });
}
