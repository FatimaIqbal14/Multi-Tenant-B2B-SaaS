import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';

export const COOKIE = 'slotwise_session';

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, tid: user.tenant_id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,                       // JavaScript in the browser can't read it (XSS defence)
    sameSite: 'lax',                      // basic CSRF defence
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function requireAuth(req, _res, next) {
  try {
    const payload = jwt.verify(req.cookies[COOKIE] ?? '', env.JWT_SECRET);
    req.auth = { userId: payload.sub, tenantId: payload.tid, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Please sign in to continue.'));
  }
}
