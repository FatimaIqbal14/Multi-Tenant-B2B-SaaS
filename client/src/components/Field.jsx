import { useId, useState } from 'react';

export default function Field({ label, error, hint, type = 'text', suffix, prefix, ...props }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  const input = (
    <div className="relative flex items-stretch">
      {prefix}
      <input
        id={id}
        type={isPassword && shown ? 'text' : type}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={`input ${prefix ? 'rounded-l-none border-l-0' : ''} ${suffix ? 'rounded-r-none border-r-0' : ''} ${isPassword ? 'pr-16' : ''}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="absolute inset-y-0 right-0 px-3.5 text-sm font-medium text-harbor-500 hover:text-harbor"
          aria-label={shown ? 'Hide password' : 'Show password'}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      )}
      {suffix}
    </div>
  );

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {input}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink/60">{hint}</p>
      ) : null}
    </div>
  );
}

/** "Organization" field with the fixed ".slotwise.app" tail so the subdomain idea is visible. */
export const DomainTail = (
  <span className="flex items-center rounded-r-lg border border-line bg-mist px-3 text-sm text-ink/60">.slotwise.app</span>
);
