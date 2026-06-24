import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Icb, OrgIcb, Region } from '../api';

const statusColor: Record<string, string> = {
  merged: 'bg-emerald-100 text-emerald-800',
  cluster: 'bg-amber-100 text-amber-800',
  solo: 'bg-sky-100 text-sky-800',
  health_board: 'bg-purple-100 text-purple-800',
  hsc_trust: 'bg-purple-100 text-purple-800',
};

export default function Orgs() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [icbs, setIcbs] = useState<Icb[]>([]);
  const [data, setData] = useState<OrgIcb[]>([]);
  const [regionId, setRegionId] = useState<number | ''>('');
  const [icbId, setIcbId] = useState<number | ''>('');

  useEffect(() => {
    Promise.all([api.regions(), api.icbs()]).then(([r, i]) => { setRegions(r); setIcbs(i); });
  }, []);

  useEffect(() => {
    api.orgs({
      region_id: regionId === '' ? undefined : regionId,
      icb_id: icbId === '' ? undefined : icbId,
    }).then(setData);
  }, [regionId, icbId]);

  const filteredIcbs = useMemo(() => regionId === '' ? icbs : icbs.filter(i => i.region_id === regionId), [icbs, regionId]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Organisations</h1>
      <p className="text-sm text-gray-600">ICB / Health Board → Trust → Hospital site.</p>

      <div className="card mt-4 flex gap-4 p-4">
        <div className="w-64">
          <label className="label">NHS region</label>
          <select className="input" value={regionId} onChange={e => { setRegionId(e.target.value === '' ? '' : Number(e.target.value)); setIcbId(''); }}>
            <option value="">All regions and nations</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="w-96">
          <label className="label">ICB / Health Board</label>
          <select className="input" value={icbId} onChange={e => setIcbId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">All</option>
            {filteredIcbs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {data.map(icb => (
          <div key={icb.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{icb.name}</h2>
              <span className={`badge ${statusColor[icb.status] ?? 'bg-gray-100 text-gray-700'}`}>{icb.status}</span>
              <span className="text-xs text-gray-500">{icb.region_name} · {icb.country}</span>
              <span className="ml-auto text-sm text-gray-700">Pop ~{(icb.population / 1_000_000).toFixed(1)}m</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Chair: <span className="text-gray-700">{icb.chair || 'n/a'}</span> · CEO: <span className="text-gray-700">{icb.ceo || 'n/a'}</span>
              {icb.notes && <> · <span className="italic">{icb.notes}</span></>}
            </div>
            <div className="mt-3 space-y-3">
              {icb.trusts.map(t => (
                <div key={t.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{t.name}</div>
                    <span className="badge bg-gray-100 text-gray-700">{t.type}</span>
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {t.sites.map(s => (
                      <li key={s.id}>
                        <Link to={`/sites/${s.id}`} className="block rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-1 text-xs text-gray-500">· {s.city} · {s.bed_count} beds</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
