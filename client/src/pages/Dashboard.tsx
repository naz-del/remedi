import { useEffect, useState } from 'react';
import { api, DashboardStats, gbp } from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.dashboard().then(setStats).catch(e => setErr(String(e)));
  }, []);

  if (err) return <div className="card p-6 text-red-700">Failed to load dashboard: {err}</div>;
  if (!stats) return <div className="text-gray-500">Loading dashboard…</div>;

  const tiles = [
    { label: 'NHS trusts tracked', value: stats.trusts, sub: 'Across ICBs and devolved nations' },
    { label: 'Hospital sites', value: stats.sites, sub: 'Linked to device inventories' },
    { label: 'Refreshes due in 90 days', value: stats.upcoming_refreshes_90d, sub: `${stats.upcoming_refreshes_365d} due in next 12 months`, accent: 'text-brand-700' },
    { label: 'Active inventory', value: stats.inventory_active, sub: 'Acquired · refurbishing · listed · shipped' },
    { label: 'Pipeline value', value: gbp(stats.inventory_pipeline_value_gbp), sub: 'Listed and in-flight stock' },
    { label: 'Data-intelligence leads', value: stats.data_intel_leads, sub: 'Manufacturers in pipeline' },
    { label: 'Data packages sold', value: gbp(stats.data_packages_sold_value_gbp), sub: 'Cycle-data subscriptions to date' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">ReMedi overview</h1>
          <p className="text-sm text-gray-600">Acquire surplus NHS medical devices · Resell into South Asia and the Far East · Monetise cycle data.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/radar" className="btn-primary">Open replenishment radar</Link>
          <Link to="/leads" className="btn">Data intelligence</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(t => (
          <div key={t.label} className="tile">
            <div className="tile-label">{t.label}</div>
            <div className={`tile-value ${t.accent ?? ''}`}>{t.value}</div>
            <div className="tile-sub">{t.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Two revenue lines</h2>
          <ol className="mt-2 list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>Acquire end-of-lifecycle but still-functional devices from NHS sites; resell at reduced cost into emerging markets.</li>
            <li>Sell replenishment-cycle intelligence to medical device manufacturers who want to time bids to NHS refreshes.</li>
          </ol>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Data sources</h2>
          <p className="mt-2 text-sm text-gray-700">ICBs and regions follow the NHS England 17 April 2026 list (25 effective entities). Devolved nations are present at one-trust-per-country resolution. Edit <code className="text-xs">server/src/seed.ts</code> to extend coverage.</p>
        </div>
      </div>
    </div>
  );
}
