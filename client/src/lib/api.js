export class ApiError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields ?? {}; }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',                       // send/receive the httpOnly session cookie
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check that the API is running.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong.', data.fields);
  return data;
}

export const api = {
  onboard: (b) => request('/auth/onboard', { method: 'POST', body: b }),
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  forgot: (b) => request('/auth/forgot-password', { method: 'POST', body: b }),
  reset: (b) => request('/auth/reset-password', { method: 'POST', body: b }),
  slugAvailable: (slug) => request(`/tenants/slug-available/${encodeURIComponent(slug)}`),
  resolveTenant: (slug) => request(`/tenants/resolve/${encodeURIComponent(slug)}`),
};

/** acme.localhost:5173 or acme.slotwise.app -> "acme". Plain localhost -> null. */
export function slugFromHostname(host = window.location.hostname) {
  const parts = host.split('.');
  const isLocal = parts[parts.length - 1] === 'localhost';
  const sub = isLocal ? (parts.length > 1 ? parts[0] : null) : (parts.length > 2 ? parts[0] : null);
  return sub && sub !== 'www' ? sub : null;
}
