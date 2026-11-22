import { Router } from 'express';

/**
 * Express 4 does not forward errors from rejected promises (async handlers) to the error
 * middleware, so a thrown HttpError would crash the process. This router wraps every handler
 * so rejections reach `next(err)`. (Express 5 does this natively.)
 */
export function asyncRouter() {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) =>
      original(path, ...handlers.map((h) => (req, res, next) => Promise.resolve(h(req, res, next)).catch(next)));
  }
  return router;
}
