import { HttpError } from '../lib/httpError.js';

/** Validate + normalise req.body with a Zod schema. Responds 422 with per-field messages. */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] ?? 'form';
      fields[key] ??= issue.message;
    }
    return next(new HttpError(422, 'Please fix the highlighted fields.', fields));
  }
  req.body = result.data;
  next();
};
