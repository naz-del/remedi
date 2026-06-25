import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Role = 'admin' | 'hospital' | 'manufacturer';
export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  scope_id: number | null;
  scope_name: string | null;
  scope_extra?: { trust_name?: string; icb_name?: string; region_name?: string; city?: string };
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const TOKEN_KEY = 'remedi.token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUser(d?.user ?? null); if (!d?.user) { localStorage.removeItem(TOKEN_KEY); setToken(null); } })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(email: string, password: string) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({ error: 'login failed' }));
      throw new Error(d?.error || 'login failed');
    }
    const data = await r.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    if (token) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, token, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

/** Wrap fetch to inject Authorization header from the active token. */
export function authFetch(token: string | null) {
  return async function f(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const r = await fetch(url, { ...init, headers });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  };
}
