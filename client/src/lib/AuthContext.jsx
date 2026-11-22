import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);   // { user, tenant } | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(setSession).catch(() => setSession(null)).finally(() => setLoading(false));
  }, []);

  const signOut = useCallback(async () => { await api.logout(); setSession(null); }, []);
  const value = useMemo(() => ({ session, setSession, loading, signOut }), [session, loading, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
