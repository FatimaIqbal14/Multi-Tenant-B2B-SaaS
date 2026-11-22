import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import Field, { DomainTail } from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { orgStepSchema, adminStepSchema, slugify, slug as slugSchema } from '../lib/validation.js';
import { useForm } from '../lib/useForm.js';

export default function Onboarding() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(1);
  const [slugEdited, setSlugEdited] = useState(false);
  const [availability, setAvailability] = useState('idle'); // idle | checking | available | taken
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const org = useForm(orgStepSchema, { orgName: '', slug: '' });
  const admin = useForm(adminStepSchema, { name: '', email: '', password: '', confirmPassword: '' });

  // Suggest an address from the organization name until the person edits it themselves.
  const onOrgName = (e) => {
    org.setField('orgName', e.target.value);
    if (!slugEdited) org.setField('slug', slugify(e.target.value));
  };

  // Debounced live availability check.
  const currentSlug = org.values.slug;
  useEffect(() => {
    if (!slugSchema.safeParse(currentSlug).success) { setAvailability('idle'); return; }
    setAvailability('checking');
    const t = setTimeout(() => {
      api.slugAvailable(currentSlug)
        .then((r) => setAvailability(r.available ? 'available' : 'taken'))
        .catch(() => setAvailability('idle'));
    }, 350);
    return () => clearTimeout(t);
  }, [currentSlug]);

  const slugHint = { checking: 'Checking availability…', available: `${currentSlug}.slotwise.app is available`, taken: '' }[availability];
  const slugError = org.bind('slug').error || (availability === 'taken' ? 'That address is already taken' : '');

  const next = org.handleSubmit(() => {
    if (availability === 'taken' || availability === 'checking') return;
    setStep(2);
  });

  const create = admin.handleSubmit(async ({ confirmPassword, ...account }) => {
    setBusy(true); setFormError('');
    try {
      const s = await api.onboard({ ...org.values, ...account });
      setSession({ user: s.user, tenant: s.tenant });
      nav('/app');
    } catch (e) {
      if (!(e instanceof ApiError)) return;
      setFormError(e.message);
      if (e.fields.slug || e.fields.orgName) { setStep(1); org.setServerErrors(e.fields); }
      else admin.setServerErrors(e.fields);
    } finally { setBusy(false); }
  });

  return (
    <AuthLayout
      title={step === 1 ? 'Set up your organization' : 'Create the owner account'}
      subtitle={step === 1
        ? 'Step 1 of 2. Pick a name and the address your team will use to sign in.'
        : `Step 2 of 2. You’ll be the owner of ${org.values.orgName}.`}
      footer={<>Already have an organization? <Link className="link" to="/login">Sign in</Link></>}
    >
      <Alert>{formError}</Alert>

      {step === 1 ? (
        <form onSubmit={next} noValidate className="space-y-5">
          <Field label="Organization name" placeholder="Brightside Dental" autoComplete="organization"
            {...org.bind('orgName')} onChange={onOrgName} />
          <Field label="Organization address" suffix={DomainTail} autoCapitalize="none"
            hint={slugHint}
            {...org.bind('slug')} error={slugError}
            onChange={(e) => { setSlugEdited(true); org.setField('slug', e.target.value.toLowerCase()); }} />
          <button className="btn" disabled={availability === 'checking'}>Continue</button>
        </form>
      ) : (
        <form onSubmit={create} noValidate className="space-y-5">
          <Field label="Full name" autoComplete="name" {...admin.bind('name')} />
          <Field label="Work email" type="email" autoComplete="email" {...admin.bind('email')} />
          <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with upper and lower case letters and a number." {...admin.bind('password')} />
          <Field label="Confirm password" type="password" autoComplete="new-password" {...admin.bind('confirmPassword')} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="w-1/3 rounded-lg border border-line bg-white px-4 py-3 text-[15px] font-semibold hover:bg-mist">Back</button>
            <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create organization'}</button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
