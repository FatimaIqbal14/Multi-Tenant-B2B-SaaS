import { useNavigate } from 'react-router-dom';
import { Brand } from '../components/AuthLayout.jsx';
import { useAuth } from '../lib/AuthContext.jsx';

// Placeholder for Week 2 (sidebar dashboard + booking calendar). It proves the session works
// and that the API only returns data for the signed-in tenant.
export default function AppHome() {
  const { session, signOut } = useAuth();
  const nav = useNavigate();
  const { user, tenant } = session;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Brand />
      <div className="mt-10 rounded-xl border border-line bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">You’re signed in to {tenant.name}</h1>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
          <dt className="text-ink/60">Signed in as</dt><dd>{user.name} ({user.email})</dd>
          <dt className="text-ink/60">Role</dt><dd className="capitalize">{user.role}</dd>
          <dt className="text-ink/60">Address</dt><dd>{tenant.slug}.slotwise.app</dd>
          {tenant.plan && (<><dt className="text-ink/60">Plan</dt><dd className="capitalize">{tenant.plan}</dd></>)}
        </dl>
        <p className="mt-6 rounded-lg bg-mist p-4 text-sm text-ink/70">
          The admin dashboard and booking calendar arrive in Week 2.
        </p>
        <button className="btn mt-6 !w-auto" onClick={async () => { await signOut(); nav('/login'); }}>Sign out</button>
      </div>
    </div>
  );
}
