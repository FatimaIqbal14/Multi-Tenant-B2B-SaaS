import { Link } from 'react-router-dom';

// [column 1-5, start row 1-8, row span, tone] - each tone is a different "organization" sharing one platform
const BLOCKS = [
  [1, 1, 2, 'bg-signal'], [1, 5, 3, 'bg-harbor-300/70'],
  [2, 2, 3, 'bg-white/80'], [2, 6, 2, 'bg-signal'],
  [3, 1, 1, 'bg-harbor-300/70'], [3, 3, 2, 'bg-signal'], [3, 6, 3, 'bg-white/80'],
  [4, 2, 2, 'bg-white/80'], [4, 5, 2, 'bg-harbor-300/70'],
  [5, 1, 3, 'bg-harbor-300/70'], [5, 5, 2, 'bg-signal'],
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function WeekGrid() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="mb-2 grid grid-cols-5 gap-2 text-xs font-medium text-white/50">
        {DAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="relative grid grid-cols-5 gap-2" style={{ gridTemplateRows: 'repeat(8, 30px)' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="rounded-md border border-white/10" style={{ gridColumn: (i % 5) + 1, gridRow: Math.floor(i / 5) + 1 }} />
        ))}
        {BLOCKS.map(([col, row, span, tone], i) => (
          <div
            key={i}
            className={`block-in rounded-md ${tone}`}
            style={{ gridColumn: col, gridRow: `${row} / span ${span}`, animationDelay: `${i * 70}ms`, transformOrigin: 'top' }}
          />
        ))}
      </div>
    </div>
  );
}

export function Brand({ light = false }) {
  return (
    <Link to="/login" className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-harbor'}`}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-signal" aria-hidden="true">
        <span className="h-3 w-3 rounded-sm bg-harbor" />
      </span>
      Slotwise
    </Link>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-harbor p-12 lg:flex">
        <Brand light />
        <div>
          <h2 className="mb-8 max-w-sm text-4xl font-semibold leading-tight text-white">
            Every organization gets its own private calendar.
          </h2>
          <WeekGrid />
        </div>
        <p className="text-sm text-white/60">Bookings stay inside the organization that created them.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-ink/70">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
