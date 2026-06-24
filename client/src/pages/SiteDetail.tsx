import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, gbp, SiteDetail as SiteDetailT } from '../api';

export default function SiteDetail() {
  const { id } = useParams();
  const [site, setSite] = useState<SiteDetailT | null>(null);
  useEffect(() => {
    if (id) api.site(Number(id)).then(setSite);
  }, [id]);
  if (!site) return <div className="text-gray-500">Loading site…</div>;

  return (
    <div>
      <Link to="/orgs" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">← Back to organisations</Link>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-900">{site.name}</h1>
      <p className="text-sm text-ink-500">{site.trust_name} · {site.icb_name} · {site.region_name} · {site.country}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="tile-label">Location</div>
          <div className="mt-1 text-sm">{site.city}, {site.postcode}</div>
          <div className="tile-label mt-3">Bed count</div>
          <div className="mt-1 text-sm">{site.bed_count}</div>
        </div>
        <div className="card p-4 md:col-span-2">
          <div className="tile-label">Contact</div>
          <div className="mt-1 text-sm font-medium">{site.contact_name}</div>
          <div className="text-sm text-gray-600">{site.contact_email}</div>
          <div className="text-sm text-gray-600">{site.contact_phone}</div>
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Device categories</h2>
      <div className="card mt-2 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Category</th>
              <th className="th">Units</th>
              <th className="th">Last refresh</th>
              <th className="th">Refresh interval</th>
              <th className="th">Next refresh</th>
              <th className="th">Est. category spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {site.devices.map(d => {
              const due = new Date(d.next_refresh_date);
              const daysUntil = Math.round((due.getTime() - Date.now()) / 86_400_000);
              const colour = daysUntil < 0 ? 'text-red-700' : daysUntil <= 90 ? 'text-amber-700' : daysUntil <= 365 ? 'text-emerald-700' : 'text-gray-700';
              return (
                <tr key={d.id}>
                  <td className="td font-medium">{d.category_name}</td>
                  <td className="td">{d.units}</td>
                  <td className="td">{d.last_refresh_date}</td>
                  <td className="td">{d.refresh_interval_years}y</td>
                  <td className={`td font-medium ${colour}`}>{d.next_refresh_date} <span className="text-xs text-gray-500">({daysUntil}d)</span></td>
                  <td className="td">{gbp(d.units * d.avg_unit_value_gbp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
