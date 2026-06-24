import { useEffect, useMemo, useState } from 'react';
import { api, BidTimingResponse, DataPackage, DeviceCategory, gbp, Icb, Manufacturer, PriceBreakdown, Region } from '../api';

const statusColor: Record<string, string> = {
  sold: 'bg-emerald-100 text-emerald-800',
  pipeline: 'bg-sky-100 text-sky-800',
};

export default function Leads() {
  const [mfrs, setMfrs] = useState<Manufacturer[]>([]);
  const [pkgs, setPkgs] = useState<DataPackage[]>([]);
  const [cats, setCats] = useState<DeviceCategory[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [icbs, setIcbs] = useState<Icb[]>([]);

  // Pricing calculator state
  const [pcCat, setPcCat] = useState<number | ''>('');
  const [pcRegion, setPcRegion] = useState<number | ''>('');
  const [pcIcb, setPcIcb] = useState<number | ''>('');
  const [pcExcl, setPcExcl] = useState<'exclusive' | 'shared'>('exclusive');
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [pricing, setPricing] = useState(false);

  // Bid-timing view state
  const [bidMfrId, setBidMfrId] = useState<number | ''>('');
  const [bid, setBid] = useState<BidTimingResponse | null>(null);

  useEffect(() => {
    Promise.all([api.manufacturers(), api.dataPackages(), api.categories(), api.regions(), api.icbs()])
      .then(([m, p, c, r, i]) => { setMfrs(m); setPkgs(p); setCats(c); setRegions(r); setIcbs(i); });
  }, []);

  const filteredIcbs = useMemo(() => pcRegion === '' ? icbs : icbs.filter(i => i.region_id === pcRegion), [icbs, pcRegion]);

  async function calcPrice() {
    setPricing(true);
    try {
      const r = await api.pricePackage({
        category_id: pcCat === '' ? null : pcCat,
        region_id: pcRegion === '' ? null : pcRegion,
        icb_id: pcIcb === '' ? null : pcIcb,
        exclusivity: pcExcl,
      });
      setBreakdown(r);
    } finally { setPricing(false); }
  }

  async function loadBid(id: number) {
    setBidMfrId(id);
    const r = await api.bidTiming(id);
    setBid(r);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Data intelligence</h1>
      <p className="text-sm text-gray-600">Sell replenishment-cycle data to medical device manufacturers. Price packages by scope + urgency + exclusivity, and time their NHS bids to refresh windows.</p>

      {/* Pricing calculator */}
      <section className="card mt-4 p-5">
        <h2 className="text-lg font-semibold">Cycle-data package pricing</h2>
        <p className="text-sm text-gray-600">Compute a suggested price from the underlying NHS device-cycle data in scope.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="label">Device category</label>
            <select className="input" value={pcCat} onChange={e => setPcCat(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">All categories</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Region</label>
            <select className="input" value={pcRegion} onChange={e => { setPcRegion(e.target.value === '' ? '' : Number(e.target.value)); setPcIcb(''); }}>
              <option value="">All regions</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ICB (optional)</label>
            <select className="input" value={pcIcb} onChange={e => setPcIcb(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Any</option>
              {filteredIcbs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Exclusivity</label>
            <select className="input" value={pcExcl} onChange={e => setPcExcl(e.target.value as any)}>
              <option value="exclusive">Exclusive (x2.2)</option>
              <option value="shared">Shared (x1.0)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={calcPrice} disabled={pricing}>{pricing ? 'Pricing…' : 'Compute price'}</button>
          </div>
        </div>

        {breakdown && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1 rounded-lg bg-brand-50 p-4 border border-brand-100">
              <div className="text-xs uppercase tracking-wide text-brand-700">Suggested price</div>
              <div className="mt-1 text-3xl font-bold text-brand-700">{gbp(breakdown.suggested_price_gbp)}</div>
              <div className="mt-2 text-xs text-gray-600">Base {gbp(breakdown.base_gbp)} · urgency x{breakdown.urgency_multiplier} · exclusivity x{breakdown.exclusivity_multiplier}</div>
            </div>
            <div className="md:col-span-2 rounded-lg bg-white p-4 border border-gray-200">
              <div className="text-xs uppercase tracking-wide text-gray-500">Rationale</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                {breakdown.rationale.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Manufacturers */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Manufacturer leads</h2>
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mfrs.map(m => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.contact_name} · {m.contact_email}</div>
                </div>
                <button className="btn" onClick={() => loadBid(m.id)}>Bid timing</button>
              </div>
              <div className="mt-3 text-xs">
                <div><span className="text-gray-500">Categories:</span> {m.interest_categories.join(', ') || '—'}</div>
                <div><span className="text-gray-500">Regions:</span> {m.interest_regions.join(', ') || '—'}</div>
                <div><span className="text-gray-500">ICBs:</span> {m.interest_icbs.join(', ') || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bid timing */}
      {bid && (
        <section className="card mt-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Bid timing — {bid.manufacturer.name}</h2>
              <p className="text-sm text-gray-600">Filtered by this manufacturer's category and region interests. Recommended bid window opens 6 months before refresh, closes 2 months before.</p>
            </div>
            <button className="btn" onClick={() => { setBid(null); setBidMfrId(''); }}>Close</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Refresh</th>
                  <th className="th">Days</th>
                  <th className="th">Bid window</th>
                  <th className="th">Category</th>
                  <th className="th">Site</th>
                  <th className="th">ICB</th>
                  <th className="th">Units</th>
                  <th className="th">Est. deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bid.opportunities.slice(0, 60).map(o => {
                  const colour = o.days_until_refresh < 0 ? 'text-red-700' : o.days_until_refresh <= 180 ? 'text-amber-700' : 'text-emerald-700';
                  const inBidWindow = (() => {
                    const now = Date.now();
                    return new Date(o.recommended_bid_start).getTime() <= now && now <= new Date(o.recommended_bid_close).getTime();
                  })();
                  return (
                    <tr key={o.id} className={inBidWindow ? 'bg-amber-50' : ''}>
                      <td className={`td font-medium ${colour}`}>{o.next_refresh_date}</td>
                      <td className={`td ${colour}`}>{o.days_until_refresh}d</td>
                      <td className="td text-xs">
                        <div>{o.recommended_bid_start}</div>
                        <div className="text-gray-500">→ {o.recommended_bid_close}</div>
                        {inBidWindow && <span className="badge mt-1 bg-amber-200 text-amber-900">Bid now</span>}
                      </td>
                      <td className="td">{o.category_name}</td>
                      <td className="td">{o.site_name}<div className="text-xs text-gray-500">{o.city}</div></td>
                      <td className="td">{o.icb_name}</td>
                      <td className="td">{o.units}</td>
                      <td className="td">{gbp(o.est_deal_value_gbp)}</td>
                    </tr>
                  );
                })}
                {bid.opportunities.length === 0 && (
                  <tr><td colSpan={8} className="td text-center text-gray-500">No matching refresh events for this manufacturer's interests.</td></tr>
                )}
              </tbody>
            </table>
            {bid.opportunities.length > 60 && (
              <div className="px-3 py-2 text-xs text-gray-500">Showing first 60 of {bid.opportunities.length} matches.</div>
            )}
          </div>
        </section>
      )}

      {/* Existing packages */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Data packages</h2>
        <div className="card mt-2 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Manufacturer</th>
                <th className="th">Scope</th>
                <th className="th">Category</th>
                <th className="th">Region / ICB</th>
                <th className="th">Exclusivity</th>
                <th className="th">Price</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pkgs.map(p => (
                <tr key={p.id}>
                  <td className="td font-medium">{p.manufacturer_name}</td>
                  <td className="td">{p.scope_description}</td>
                  <td className="td">{p.category_name ?? '—'}</td>
                  <td className="td">{p.icb_name ?? p.region_name ?? '—'}</td>
                  <td className="td">{p.exclusivity}</td>
                  <td className="td font-medium">{gbp(p.price_gbp)}</td>
                  <td className="td"><span className={`badge ${statusColor[p.status] ?? 'bg-gray-100 text-gray-700'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
