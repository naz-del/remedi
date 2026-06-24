import { useEffect, useState } from 'react';
import { api, gbp, InventoryItem } from '../api';

const statusColor: Record<string, string> = {
  acquired: 'bg-gray-100 text-gray-800',
  refurbishing: 'bg-amber-100 text-amber-800',
  listed: 'bg-sky-100 text-sky-800',
  shipped: 'bg-violet-100 text-violet-800',
  sold: 'bg-emerald-100 text-emerald-800',
};

const conditionColor: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-amber-100 text-amber-800',
  C: 'bg-orange-100 text-orange-800',
};

export default function Inventory() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [status, setStatus] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  useEffect(() => {
    api.inventory({
      status: status || undefined,
      destination_country: country || undefined,
    }).then(setRows);
  }, [status, country]);

  const countries = Array.from(new Set(rows.map(r => r.destination_country).filter(Boolean))) as string[];
  const acqTotal = rows.reduce((s, r) => s + r.acquisition_cost_gbp, 0);
  const listedTotal = rows.reduce((s, r) => s + (r.listed_price_gbp ?? 0), 0);
  const margin = listedTotal - acqTotal;

  return (
    <div>
      <h1 className="text-2xl font-bold">Inventory</h1>
      <p className="text-sm text-gray-600">Devices acquired from NHS sites, refurbished, listed, shipped, sold.</p>

      <div className="card mt-4 grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            {['acquired', 'refurbishing', 'listed', 'shipped', 'sold'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Destination country</label>
          <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
            <option value="">All</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="tile"><div className="tile-label">Items</div><div className="tile-value">{rows.length}</div></div>
        <div className="tile"><div className="tile-label">Acquisition cost</div><div className="tile-value">{gbp(acqTotal)}</div></div>
        <div className="tile"><div className="tile-label">Listed value</div><div className="tile-value">{gbp(listedTotal)}</div></div>
        <div className="tile"><div className="tile-label">Implied margin</div><div className="tile-value text-brand-700">{gbp(margin)}</div></div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Device</th>
              <th className="th">Source</th>
              <th className="th">Condition</th>
              <th className="th">Acquisition</th>
              <th className="th">Listed</th>
              <th className="th">Margin</th>
              <th className="th">Status</th>
              <th className="th">Destination</th>
              <th className="th">Acquired</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="td font-medium">{r.device_type}</td>
                <td className="td">
                  <div>{r.source_site_name ?? '—'}</div>
                  <div className="text-xs text-gray-500">{r.trust_name ?? ''}</div>
                </td>
                <td className="td"><span className={`badge ${conditionColor[r.condition_grade] ?? 'bg-gray-100 text-gray-700'}`}>Grade {r.condition_grade}</span></td>
                <td className="td">{gbp(r.acquisition_cost_gbp)}</td>
                <td className="td">{gbp(r.listed_price_gbp)}</td>
                <td className="td font-medium text-brand-700">{r.listed_price_gbp != null ? gbp(r.listed_price_gbp - r.acquisition_cost_gbp) : '—'}{r.status === 'sold' && <span className="ml-1 text-[10px] text-gray-500">realised</span>}</td>
                <td className="td"><span className={`badge ${statusColor[r.status] ?? 'bg-gray-100 text-gray-700'}`}>{r.status}</span></td>
                <td className="td">{r.destination_country ?? '—'}</td>
                <td className="td">{r.acquired_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
