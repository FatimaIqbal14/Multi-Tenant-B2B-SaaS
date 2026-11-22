import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import OrgField from '../components/OrgField.jsx';
import Alert from '../components/Alert.jsx';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { loginSchema } from '../lib/validation.js';
import { useForm } from '../lib/useForm.js';

export default function Login() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const form = useForm(loginSchema, { slug: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = form.handleSubmit(async (data) => {
    setBusy(true); setFormError('');
    try {
      setSession(await api.login(data));
      nav('/app');
    } catch (e) {
      if (e instanceof ApiError) { setFormError(e.message); form.setServerErrors(e.fields); }
    } finally { setBusy(false); }
  });

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the address your organization chose when it joined."
      footer={<>New to Slotwise? <Link className="link" to="/onboarding">Create an organization</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Alert>{formError}</Alert>
        <OrgField form={form} />
        <Field label="Email" type="email" autoComplete="email" placeholder="you@company.com" {...form.bind('email')} />
        <Field label="Password" type="password" autoComplete="current-password" {...form.bind('password')} />
        <div className="text-right text-sm"><Link className="link" to="/forgot-password">Forgot your password?</Link></div>
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}
