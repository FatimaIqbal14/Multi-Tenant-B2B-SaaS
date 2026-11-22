import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import OrgField from '../components/OrgField.jsx';
import Alert from '../components/Alert.jsx';
import { api, ApiError } from '../lib/api.js';
import { forgotSchema } from '../lib/validation.js';
import { useForm } from '../lib/useForm.js';

export default function ForgotPassword() {
  const form = useForm(forgotSchema, { slug: '', email: '' });
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = form.handleSubmit(async (data) => {
    setBusy(true); setFormError('');
    try { await api.forgot(data); setSent(true); }
    catch (e) { if (e instanceof ApiError) setFormError(e.message); }
    finally { setBusy(false); }
  });

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your organization address and email. If there’s a matching account, we’ll send a reset link."
      footer={<Link className="link" to="/login">Back to sign in</Link>}
    >
      {sent ? (
        <Alert tone="success">
          Check your inbox for a reset link. It expires in 1 hour.
          <span className="mt-1 block text-ink/60">Local development: the link is printed in the API server logs.</span>
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Alert>{formError}</Alert>
          <OrgField form={form} />
          <Field label="Email" type="email" autoComplete="email" {...form.bind('email')} />
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthLayout>
  );
}
