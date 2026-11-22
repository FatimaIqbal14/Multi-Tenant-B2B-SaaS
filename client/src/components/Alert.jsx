export default function Alert({ tone = 'error', children }) {
  if (!children) return null;
  const styles = tone === 'error'
    ? 'border-danger/30 bg-danger/5 text-danger'
    : 'border-harbor-500/30 bg-harbor-500/10 text-harbor';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}
