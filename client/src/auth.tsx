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
  impersonating: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  impersonate(userId: number): Promise<void>;
  stopImpersonating(): Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const TOKEN_KEY = 'remedi.token';
const ADMIN_TOKEN_KEY = 'remedi.admin.token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);
  const [impersonating, setImpersonating] = useState<boolean>(() => !!localStorage.getItem(ADMIN_TOKEN_KEY));

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setUser(d?.user ?? null);
        if (!d?.user) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
          setImpersonating(false);
        }
      })
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
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.setItem(TOKEN_KEY, data.token);
    setImpersonating(false);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    if (token) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setImpersonating(false);
  }

  async function impersonate(userId: number) {
    if (!token) throw new Error('not logged in');
    const r = await fetch('/api/auth/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({ error: 'impersonate failed' }));
      throw new Error(d?.error || 'impersonate failed');
    }
    const data = await r.json();
    // Stash the current admin token (only if we don't already have one stashed).
    if (!localStorage.getItem(ADMIN_TOKEN_KEY)) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setImpersonating(true);
    setToken(data.token);
    setUser(data.user);
  }

  async function stopImpersonating() {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!adminToken) { setImpersonating(false); return; }
    localStorage.setItem(TOKEN_KEY, adminToken);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setImpersonating(false);
    setToken(adminToken);
    setLoading(true);
  }

  return (
    <Ctx.Provider value={{ user, token, loading, impersonating, login, logout, impersonate, stopImpersonating }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
