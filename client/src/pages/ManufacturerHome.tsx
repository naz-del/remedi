import { useEffect, useState } from 'react';
import { api, ManufacturerScope, gbp } from '../api';
import { Icon } from '../components/Icons';
import { useAuth } from '../auth';

export default function ManufacturerHome() {
  const { user } = useAuth();
  const [data, setData] = useState<ManufacturerScope | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.meManufacturer().then(setData).catch(e => setErr(String(e))); }, []);

  if (err) return <div className="card p-6 text-red-700">Failed to load: {err}</div>;
  if (!data) return <div className="text-ink-400">Loading…</div>;
  const { manufacturer, summary, opportunities, packages } = data;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-7 shadow-card">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #41B6E6 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            <Icon.Spark size={12} /> Manufacturer portal
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900">{manufacturer.name}</h1>
          <p className="mt-1 text-sm text-ink-500">{user?.name} · interests: {summary.interest_categories.join(', ')}</p>
        </div>
      </section>

      {/* Tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="tile"><div className="tile-accent" /><div className="tile-label">Bid windows open now</div><div className="tile-value text-brand-700">{summary.bid_now_count}</div><div className="tile-sub">Active recommendations</div></div>
        <div className="tile"><div className="tile-label">Refresh in 30 days</div><div className="tile-value">{summary.next_30d}</div><div className="tile-sub">Across matching NHS sites</div></div>
        <div className="tile"><div className="tile-label">Pipeline value</div><div className="tile-value">{gbp(summary.total_pipeline_gbp)}</div><div className="tile-sub">Estimated total opportunity</div></div>
        <div className="tile"><div className="tile-label">Data packages owned</div><div className="tile-value text-accent-700">{summary.packages_owned}</div><div className="tile-sub">{gbp(summary.packages_spend_gbp)} subscription spend</div></div>
      </div>

      {/* Opportunities */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Bid timing — your matching opportunities</h2>
            <p className="text-xs text-ink-500">Filtered to {summary.interest_categories.join(', ')} across {summary.interest_regions.join(', ')}. Recommended bid window opens 6 months before refresh, closes 2 months before.</p>
          </div>
        </div>
        <div className="card mt-2 overflow-hidden">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="th">Refresh</th>
                <th className="th">Days</th>
                <th className="th">Bid window</th>
                <th className="th">Category</th>
                <th className="th">Site</th>
                <th className="th">ICB</th>
                <th className="th text-right">Units</th>
                <th className="th text-right">Est. deal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {opportunities.slice(0, 50).map(o => {
                const colour = o.days_until_refresh < 0 ? 'text-red-700' : o.days_until_refresh <= 180 ? 'text-amber-700' : 'text-accent-700';
                const inWindow = (() => {
                  const now = Date.now();
                  return new Date(o.recommended_bid_start).getTime() <= now && now <= new Date(o.recommended_bid_close).getTime();
                })();
                return (
                  <tr key={o.id} className={inWindow ? 'bg-amber-50' : ''}>
                    <td className={`td font-medium ${colour}`}>{o.next_refresh_date}</td>
                    <td className={`td ${colour}`}>{o.days_until_refresh}d</td>
                    <td className="td text-xs">
                      <div>{o.recommended_bid_start}</div>
                      <div className="text-ink-400">→ {o.recommended_bid_close}</div>
                      {inWindow && <span className="badge mt-1 bg-amber-200 text-amber-900">Bid now</span>}
                    </td>
                    <td className="td">{o.category_name}</td>
                    <td className="td"><div>{o.site_name}</div><div className="text-xs text-ink-400">{o.city}</div></td>
                    <td className="td">{o.icb_name}</td>
                    <td className="td text-right">{o.units}</td>
                    <td className="td text-right font-medium">{gbp(o.est_deal_value_gbp)}</td>
                  </tr>
                );
              })}
              {opportunities.length === 0 && (<tr><td colSpan={8} className="td text-center text-ink-400">No matching opportunities right now.</td></tr>)}
            </tbody>
          </table>
          {opportunities.length > 50 && (<div className="px-3 py-2 text-xs text-ink-400">Showing first 50 of {opportunities.length} matches.</div>)}
        </div>
      </section>

      {/* Packages */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Your cycle-data packages</h2>
        <div className="card mt-2 overflow-hidden">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="th">Scope</th>
                <th className="th">Category</th>
                <th className="th">Region / ICB</th>
                <th className="th">Exclusivity</th>
                <th className="th text-right">Price</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {packages.map(p => (
                <tr key={p.id}>
                  <td className="td font-medium text-ink-900">{p.scope_description}</td>
                  <td className="td">{p.category_name ?? '—'}</td>
                  <td className="td">{p.icb_name ?? p.region_name ?? '—'}</td>
                  <td className="td">{p.exclusivity}</td>
                  <td className="td text-right font-medium">{gbp(p.price_gbp)}</td>
                  <td className="td"><span className={`badge ${p.status === 'sold' ? 'bg-accent-50 text-accent-700' : 'bg-brand-50 text-brand-700'}`}>{p.status}</span></td>
                </tr>
              ))}
              {packages.length === 0 && (<tr><td colSpan={6} className="td text-center text-ink-400">No packages on file.</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
