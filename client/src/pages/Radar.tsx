import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DeviceCategory, gbp, Icb, Region, ReplenishmentRow } from '../api';
import { PageHeader } from '../components/PageHeader';

const windows = [
  { label: 'Next 90 days', value: 90 },
  { label: 'Next 6 months', value: 180 },
  { label: 'Next 12 months', value: 365 },
  { label: 'Next 24 months', value: 730 },
  { label: 'Any time', value: '' as const },
];

export default function Radar() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [icbs, setIcbs] = useState<Icb[]>([]);
  const [cats, setCats] = useState<DeviceCategory[]>([]);
  const [rows, setRows] = useState<ReplenishmentRow[]>([]);
  const [regionId, setRegionId] = useState<number | ''>('');
  const [icbId, setIcbId] = useState<number | ''>('');
  const [catId, setCatId] = useState<number | ''>('');
  const [within, setWithin] = useState<number | ''>(365);

  useEffect(() => {
    Promise.all([api.regions(), api.icbs(), api.categories()]).then(([r, i, c]) => { setRegions(r); setIcbs(i); setCats(c); });
  }, []);

  useEffect(() => {
    api.replenishment({
      region_id: regionId === '' ? undefined : regionId,
      icb_id: icbId === '' ? undefined : icbId,
      category_id: catId === '' ? undefined : catId,
      within_days: within === '' ? undefined : within,
    }).then(setRows);
  }, [regionId, icbId, catId, within]);

  const filteredIcbs = useMemo(() => regionId === '' ? icbs : icbs.filter(i => i.region_id === regionId), [icbs, regionId]);
  const totalSpend = rows.reduce((s, r) => s + r.est_refresh_spend_gbp, 0);

  return (
    <div>
      <PageHeader title="Replenishment radar" subtitle="Upcoming NHS refresh events, soonest first. The targeting tool for both device acquisition and cycle-data sales." icon="Radar" />

      <div className="card mt-4 grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
        <div>
          <label className="label">Region</label>
          <select className="input" value={regionId} onChange={e => { setRegionId(e.target.value === '' ? '' : Number(e.target.value)); setIcbId(''); }}>
            <option value="">All</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">ICB / Health Board</label>
          <select className="input" value={icbId} onChange={e => setIcbId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">All</option>
            {filteredIcbs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Device category</label>
          <select className="input" value={catId} onChange={e => setCatId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">All</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Time window</label>
          <select className="input" value={within} onChange={e => setWithin(e.target.value === '' ? '' : Number(e.target.value))}>
            {windows.map(w => <option key={w.label} value={w.value}>{w.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex gap-4 text-sm text-gray-600">
        <div><span className="font-semibold text-gray-900">{rows.length}</span> refresh events</div>
        <div><span className="font-semibold text-gray-900">{gbp(totalSpend)}</span> estimated NHS refresh spend in window</div>
      </div>

      <div className="card mt-2 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Next refresh</th>
              <th className="th">Days</th>
              <th className="th">Category</th>
              <th className="th">Site</th>
              <th className="th">Trust</th>
              <th className="th">ICB</th>
              <th className="th">Units</th>
              <th className="th">Est. spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map(r => {
              const days = r.days_until_refresh;
              const colour = days < 0 ? 'text-red-700' : days <= 90 ? 'text-amber-700' : days <= 365 ? 'text-emerald-700' : 'text-gray-700';
              return (
                <tr key={r.id}>
                  <td className={`td font-medium ${colour}`}>{r.next_refresh_date}</td>
                  <td className={`td ${colour}`}>{days}d</td>
                  <td className="td">{r.category_name}</td>
                  <td className="td">
                    <Link to={`/sites/${r.site_id}`} className="text-brand-700 hover:underline">{r.site_name}</Link>
                    <div className="text-xs text-gray-500">{r.city}</div>
                  </td>
                  <td className="td">{r.trust_name}</td>
                  <td className="td">{r.icb_name}</td>
                  <td className="td">{r.units}</td>
                  <td className="td">{gbp(r.est_refresh_spend_gbp)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="td text-center text-gray-500">No refresh events in this window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
