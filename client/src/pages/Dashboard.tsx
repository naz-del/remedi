import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DashboardStats, gbp } from '../api';
import { Icon } from '../components/Icons';

type Tile = { label: string; value: string | number; sub: string; accent?: boolean; icon: keyof typeof Icon };

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.dashboard().then(setStats).catch(e => setErr(String(e)));
  }, []);

  if (err) return <div className="card p-6 text-red-700">Failed to load dashboard: {err}</div>;
  if (!stats) return <div className="text-ink-400">Loading dashboard…</div>;

  const tiles: Tile[] = [
    { label: 'NHS trusts tracked', value: stats.trusts, sub: 'Across ICBs and devolved nations', icon: 'Building' },
    { label: 'Hospital sites', value: stats.sites, sub: 'Linked to device inventories', icon: 'Building' },
    { label: 'Refreshes due in 90 days', value: stats.upcoming_refreshes_90d, sub: `${stats.upcoming_refreshes_365d} due in next 12 months`, accent: true, icon: 'Radar' },
    { label: 'Active inventory', value: stats.inventory_active, sub: 'Acquired · refurbishing · listed · shipped', icon: 'Box' },
    { label: 'Pipeline value', value: gbp(stats.inventory_pipeline_value_gbp), sub: 'Listed and in-flight stock', icon: 'Coins' },
    { label: 'Data-intelligence leads', value: stats.data_intel_leads, sub: 'Manufacturers in pipeline', icon: 'Spark' },
    { label: 'Data packages sold', value: gbp(stats.data_packages_sold_value_gbp), sub: 'Cycle-data subscriptions to date', icon: 'TrendUp' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-7 shadow-card">
        <div
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #41B6E6 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" /> Live POC
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900">
              Reuse what the NHS retires.
            </h1>
            <p className="mt-1 max-w-xl text-sm text-ink-500">
              Acquire surplus NHS medical devices · Resell into South Asia and the Far East ·
              Monetise replenishment-cycle intelligence.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/radar" className="btn-primary">
              Open radar <Icon.ArrowRight size={14} />
            </Link>
            <Link to="/leads" className="btn">Data intelligence</Link>
          </div>
        </div>
      </section>

      {/* Tiles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(t => {
          const I = Icon[t.icon];
          return (
            <div key={t.label} className="tile">
              {t.accent && <div className="tile-accent" />}
              <div className="flex items-start justify-between">
                <div className="tile-label">{t.label}</div>
                <div className="rounded-lg bg-ink-50 p-1.5 text-ink-400">
                  <I size={14} />
                </div>
              </div>
              <div className={`tile-value ${t.accent ? 'text-brand-700' : ''}`}>{t.value}</div>
              <div className="tile-sub">{t.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Explainer */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Two revenue lines</h2>
          <ol className="mt-3 space-y-2 text-sm text-ink-700">
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">1</span>
              <span>Acquire end-of-lifecycle but still-functional devices from NHS sites; resell at reduced cost into emerging markets.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">2</span>
              <span>Sell replenishment-cycle intelligence to medical device manufacturers who want to time bids to NHS refreshes.</span>
            </li>
          </ol>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Data sources</h2>
          <p className="mt-3 text-sm text-ink-700">
            ICBs and regions follow the NHS England 17 April 2026 list (25 effective entities).
            Devolved nations are present at one-trust-per-country resolution.
            Edit <code className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-xs text-ink-700">server/src/seed.ts</code> to extend coverage.
          </p>
        </div>
      </div>
    </div>
  );
}
