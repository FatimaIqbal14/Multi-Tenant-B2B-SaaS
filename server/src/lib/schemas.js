import { z } from 'zod';

const RESERVED = ['www', 'api', 'app', 'admin', 'auth', 'login', 'static', 'mail', 'billing', 'support'];

export const slug = z.string().trim().toLowerCase()
  .min(3, 'Use at least 3 characters')
  .max(30, 'Use 30 characters or fewer')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens')
  .refine((s) => !RESERVED.includes(s), 'That address is reserved');

export const email = z.string().trim().toLowerCase().email('Enter a valid email address');

export const password = z.string()
  .min(8, 'Use at least 8 characters').max(72, 'Use 72 characters or fewer')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

const personName = z.string().trim().min(2, 'Enter your full name').max(80);

export const onboardSchema = z.object({
  orgName: z.string().trim().min(2, 'Enter your organization name').max(80),
  slug, name: personName, email, password,
});
export const registerSchema = z.object({ slug, name: personName, email, password });
export const loginSchema = z.object({ slug, email, password: z.string().min(1, 'Enter your password') });
export const forgotSchema = z.object({ slug, email });
export const resetSchema = z.object({ slug, token: z.string().min(32), password });
