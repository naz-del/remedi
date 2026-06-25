import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { LogoMark, LogoWordmark } from '../components/Logo';

type Demo = { label: string; email: string; password: string; sub: string; emoji?: string };

const demos: { role: string; accent: string; subs: Demo[] }[] = [
  {
    role: 'Hospital POV',
    accent: 'border-brand-200 hover:border-brand-500',
    subs: [
      { label: 'Manchester Royal Infirmary', sub: 'Dr Sarah Khan · MFT', email: 'manchester@nhs.uk', password: 'nhs123' },
      { label: 'Leeds General Infirmary', sub: 'Dr Mark Ellis · LTHT', email: 'leeds@nhs.uk', password: 'nhs123' },
      { label: "St Thomas' Hospital", sub: 'Dr Olivia Mensah · GSTT', email: 'gstt@nhs.uk', password: 'nhs123' },
    ],
  },
  {
    role: 'Manufacturer POV',
    accent: 'border-accent-200 hover:border-accent-500',
    subs: [
      { label: 'Medtronic UK', sub: 'Sophie Allen', email: 'sales@medtronic.example', password: 'mfr123' },
      { label: 'Philips Healthcare UK', sub: 'Daniel Foster', email: 'sales@philips.example', password: 'mfr123' },
      { label: 'GE Healthcare UK', sub: 'Helena Berg', email: 'sales@ge.example', password: 'mfr123' },
    ],
  },
  {
    role: 'Admin (us)',
    accent: 'border-ink-200 hover:border-ink-700',
    subs: [
      { label: 'ReMedi Admin', sub: 'Full visibility across all data', email: 'admin@remedi.uk', password: 'admin123' },
    ],
  },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await login(email, password); nav('/'); }
    catch (e: any) { setErr(e.message || 'login failed'); }
    finally { setBusy(false); }
  }

  async function quick(d: Demo) {
    setBusy(true); setErr(null);
    try { await login(d.email, d.password); nav('/'); }
    catch (e: any) { setErr(e.message || 'login failed'); setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex items-center gap-3 justify-center">
          <LogoMark size={48} />
          <div className="flex flex-col">
            <LogoWordmark className="text-2xl" />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">NHS device reuse</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
          {/* Quick-pick demos */}
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Choose a demo POV</h1>
            <p className="mt-1 text-sm text-ink-500">Three role perspectives, same data. Pick one to see what that user sees.</p>
            <div className="mt-5 space-y-5">
              {demos.map(d => (
                <section key={d.role}>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">{d.role}</h2>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {d.subs.map(s => (
                      <button
                        key={s.email}
                        onClick={() => quick(s)}
                        disabled={busy}
                        className={`text-left rounded-xl border bg-white p-3 transition shadow-card ${d.accent} disabled:opacity-50`}
                      >
                        <div className="font-medium text-ink-900">{s.label}</div>
                        <div className="text-xs text-ink-500">{s.sub}</div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Manual login */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold">Or sign in manually</h2>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="pw">Password</label>
                <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              {err && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
              <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <div className="mt-5 border-t border-ink-100 pt-3 text-[11px] text-ink-400">
              POC accounts have plain-text passwords for demo speed. Don't reuse credentials.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
