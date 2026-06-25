import { useEffect, useMemo, useState } from 'react';
import { api, AuthUser } from '../api';
import { useAuth } from '../auth';
import { Icon } from './Icons';

const roleStyles: Record<string, { label: string; tile: string; chip: string; icon: keyof typeof Icon }> = {
  hospital: {
    label: 'Hospital',
    tile: 'border-brand-200 hover:border-brand-500',
    chip: 'bg-brand-50 text-brand-700',
    icon: 'Building',
  },
  manufacturer: {
    label: 'Manufacturer',
    tile: 'border-accent-200 hover:border-accent-500',
    chip: 'bg-accent-50 text-accent-700',
    icon: 'Spark',
  },
  admin: {
    label: 'Admin',
    tile: 'border-ink-200',
    chip: 'bg-ink-900 text-white',
    icon: 'Dashboard',
  },
};

export function ImpersonatePanel() {
  const { user, impersonate } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => { api.authUsers().then(d => setUsers(d.users)).catch(() => {}); }, []);

  const groups = useMemo(() => {
    const g: Record<string, AuthUser[]> = { hospital: [], manufacturer: [] };
    for (const u of users) if (u.id !== user?.id && u.role !== 'admin') (g[u.role] ??= []).push(u);
    return g;
  }, [users, user?.id]);

  async function pick(id: number) {
    setBusy(id);
    try { await impersonate(id); }
    finally { setBusy(null); }
  }

  if (users.length === 0) return null;

  return (
    <section className="mt-8 card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">View as another user</h2>
          <p className="text-sm text-ink-500">See exactly what a hospital site or a manufacturer sees in the portal. Use "Return to admin" in the top banner to come back.</p>
        </div>
      </div>

      {(['hospital', 'manufacturer'] as const).map(role => (
        <div key={role} className="mt-5">
          <div className="flex items-center gap-2">
            <span className={`badge ${roleStyles[role].chip}`}>{roleStyles[role].label}</span>
            <span className="text-xs text-ink-400">{groups[role]?.length ?? 0} accounts</span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(groups[role] ?? []).map(u => {
              const RoleIcon = Icon[roleStyles[role].icon];
              return (
                <button
                  key={u.id}
                  onClick={() => pick(u.id)}
                  disabled={busy !== null}
                  className={`text-left rounded-xl border bg-white p-3 shadow-card transition disabled:opacity-50 ${roleStyles[role].tile}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${roleStyles[role].chip}`}>
                      <RoleIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-ink-900 truncate">{u.scope_name ?? u.name}</div>
                      <div className="text-xs text-ink-500 truncate">{u.name} · {u.email}</div>
                    </div>
                    {busy === u.id && <span className="ml-auto text-xs text-ink-400">…</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
