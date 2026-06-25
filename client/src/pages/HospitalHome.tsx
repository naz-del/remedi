import { useEffect, useState } from 'react';
import { api, HospitalScope, gbp } from '../api';
import { Icon } from '../components/Icons';
import { useAuth } from '../auth';

export default function HospitalHome() {
  const { user } = useAuth();
  const [data, setData] = useState<HospitalScope | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.meHospital().then(setData).catch(e => setErr(String(e))); }, []);

  if (err) return <div className="card p-6 text-red-700">Failed to load: {err}</div>;
  if (!data) return <div className="text-ink-400">Loading…</div>;
  const { site, devices, summary, enquiries } = data;

  const upcoming = devices.filter(d => d.days_until_refresh >= 0 && d.days_until_refresh <= 365);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-7 shadow-card">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #41B6E6 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            <Icon.Building size={12} /> Hospital portal · {site.trust_name}
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900">{site.name}</h1>
          <p className="mt-1 text-sm text-ink-500">{user?.name} · {site.icb_name} · {site.region_name}</p>
        </div>
      </section>

      {/* Tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="tile"><div className="tile-label">Device categories</div><div className="tile-value">{summary.devices}</div><div className="tile-sub">Across this site</div></div>
        <div className="tile"><div className="tile-accent" /><div className="tile-label">Refresh in 90 days</div><div className="tile-value text-brand-700">{summary.upcoming_90d}</div><div className="tile-sub">{summary.upcoming_365d} in next 12 months</div></div>
        <div className="tile"><div className="tile-label">Replacement value</div><div className="tile-value">{gbp(summary.replacement_value_gbp)}</div><div className="tile-sub">What it would cost to re-buy new</div></div>
        <div className="tile"><div className="tile-label">Est. divestment</div><div className="tile-value text-accent-700">{gbp(summary.estimated_divestment_gbp)}</div><div className="tile-sub">Estimated recoverable value via ReMedi</div></div>
      </div>

      {/* Upcoming refreshes */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Devices coming up for refresh</h2>
            <p className="text-xs text-ink-500">Sell pre-refresh and lock in additional capex offset.</p>
          </div>
        </div>
        <div className="card mt-2 overflow-hidden">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="th">Category</th>
                <th className="th text-right">Units</th>
                <th className="th">Refresh due</th>
                <th className="th">Days</th>
                <th className="th text-right">Replacement value</th>
                <th className="th text-right">Est. divestment</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {upcoming.map(d => {
                const colour = d.days_until_refresh < 0 ? 'text-red-700' : d.days_until_refresh <= 90 ? 'text-amber-700' : 'text-accent-700';
                return (
                  <tr key={d.id}>
                    <td className="td font-medium text-ink-900">{d.category_name}</td>
                    <td className="td text-right">{d.units}</td>
                    <td className={`td font-medium ${colour}`}>{d.next_refresh_date}</td>
                    <td className={`td ${colour}`}>{d.days_until_refresh}d</td>
                    <td className="td text-right">{gbp(d.replacement_value_gbp)}</td>
                    <td className="td text-right text-accent-700 font-medium">{gbp(d.estimated_divestment_gbp)}</td>
                    <td className="td"><button className="btn">Request quote</button></td>
                  </tr>
                );
              })}
              {upcoming.length === 0 && (<tr><td colSpan={7} className="td text-center text-ink-400">No refreshes due in the next 12 months.</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {/* Enquiries from ReMedi */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Recent enquiries from ReMedi</h2>
        <div className="card mt-2 overflow-hidden">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50">
              <tr>
                <th className="th">Subject</th>
                <th className="th">From</th>
                <th className="th">Status</th>
                <th className="th text-right">Indicative value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {enquiries.map((e, i) => (
                <tr key={i}>
                  <td className="td font-medium text-ink-900">{e.subject}</td>
                  <td className="td">{e.from}</td>
                  <td className="td"><span className="badge bg-brand-50 text-brand-700">{e.status}</span></td>
                  <td className="td text-right text-accent-700 font-medium">{gbp(e.value_gbp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
