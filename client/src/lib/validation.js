import { z } from 'zod';

// Mirrors server/src/lib/schemas.js so users get instant feedback; the server re-validates everything.
const RESERVED = ['www', 'api', 'app', 'admin', 'auth', 'login', 'static', 'mail', 'billing', 'support'];

export const slug = z.string().trim().toLowerCase()
  .min(3, 'Use at least 3 characters')
  .max(30, 'Use 30 characters or fewer')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens')
  .refine((s) => !RESERVED.includes(s), 'That address is reserved');

export const email = z.string().trim().min(1, 'Enter your email').email('Enter a valid email address');

export const password = z.string()
  .min(8, 'Use at least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

const fullName = z.string().trim().min(2, 'Enter your full name');
const matches = (data) => data.password === data.confirmPassword;
const mismatch = { message: 'Passwords don’t match', path: ['confirmPassword'] };

export const orgStepSchema = z.object({
  orgName: z.string().trim().min(2, 'Enter your organization name').max(80),
  slug,
});
export const adminStepSchema = z.object({
  name: fullName, email, password, confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine(matches, mismatch);

export const registerSchema = z.object({
  slug, name: fullName, email, password, confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine(matches, mismatch);

export const loginSchema = z.object({ slug, email, password: z.string().min(1, 'Enter your password') });
export const forgotSchema = z.object({ slug, email });
export const resetSchema = z.object({
  slug, password, confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine(matches, mismatch);

export const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
