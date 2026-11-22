import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';
import { api, ApiError } from '../lib/api.js';
import { resetSchema } from '../lib/validation.js';
import { useForm } from '../lib/useForm.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') ?? '';
  const form = useForm(resetSchema, { slug: params.get('org') ?? '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = form.handleSubmit(async ({ slug, password }) => {
    setBusy(true); setFormError('');
    try {
      await api.reset({ slug, token, password });
      nav('/login', { replace: true });
    } catch (e) { if (e instanceof ApiError) { setFormError(e.message); form.setServerErrors(e.fields); } }
    finally { setBusy(false); }
  });

  if (!token) {
    return (
      <AuthLayout title="This link is incomplete" footer={<Link className="link" to="/forgot-password">Request a new link</Link>}>
        <Alert>The reset link is missing its token. Open the full link from your email, or request a new one.</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle={`You’re resetting the password for ${form.values.slug || 'your organization'}.`}
      footer={<Link className="link" to="/login">Back to sign in</Link>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <Alert>{formError}</Alert>
        <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters with upper and lower case letters and a number." {...form.bind('password')} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" {...form.bind('confirmPassword')} />
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </AuthLayout>
  );
}
