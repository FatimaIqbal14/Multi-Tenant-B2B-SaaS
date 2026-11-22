import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import OrgField from '../components/OrgField.jsx';
import Alert from '../components/Alert.jsx';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { registerSchema } from '../lib/validation.js';
import { useForm } from '../lib/useForm.js';

export default function Register() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const form = useForm(registerSchema, { slug: '', name: '', email: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = form.handleSubmit(async ({ confirmPassword, ...data }) => {
    setBusy(true); setFormError('');
    try {
      const s = await api.register(data);
      setSession({ user: s.user, tenant: s.tenant });
      nav('/app');
    } catch (e) {
      if (e instanceof ApiError) { setFormError(e.message); form.setServerErrors(e.fields); }
    } finally { setBusy(false); }
  });

  return (
    <AuthLayout
      title="Join your team"
      subtitle="Create your account inside an organization that already uses Slotwise."
      footer={<>Already have an account? <Link className="link" to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Alert>{formError}</Alert>
        <OrgField form={form} />
        <Field label="Full name" autoComplete="name" {...form.bind('name')} />
        <Field label="Work email" type="email" autoComplete="email" {...form.bind('email')} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with upper and lower case letters and a number." {...form.bind('password')} />
        <Field label="Confirm password" type="password" autoComplete="new-password" {...form.bind('confirmPassword')} />
        <button className="btn" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}
