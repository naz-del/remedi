import { useEffect, useMemo, useState } from 'react';
import { api, DemandMarket, gbp, Match } from '../api';

const budgetColor: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-800',
  mid: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-700',
};

const conditionColor: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-amber-100 text-amber-800',
  C: 'bg-orange-100 text-orange-800',
};

export default function Demand() {
  const [rows, setRows] = useState<DemandMarket[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.demandMarkets().then(setRows);
    api.matches().then(setMatches);
  }, []);

  // group by country
  const byCountry = rows.reduce<Record<string, DemandMarket[]>>((acc, r) => {
    (acc[r.country] ??= []).push(r); return acc;
  }, {});

  const matchesByDemand = useMemo(() => {
    const m: Record<number, Match[]> = {};
    for (const x of matches) (m[x.demand_id] ??= []).push(x);
    return m;
  }, [matches]);

  const topMatches = matches.slice(0, 8);

  return (
    <div>
      <h1 className="text-2xl font-bold">Demand markets</h1>
      <p className="text-sm text-gray-600">Destination hospitals in South Asia and the Far East. Match acquired UK stock to declared needs.</p>

      {/* Top match suggestions */}
      <section className="card mt-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Top match suggestions</h2>
            <p className="text-xs text-gray-500">Highest-confidence pairings of acquired stock to declared demand. Score combines type match, budget fit, and condition grade.</p>
          </div>
          <div className="text-sm text-gray-600">{matches.length} total matches</div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Score</th>
                <th className="th">Ship this</th>
                <th className="th">To</th>
                <th className="th">Listed</th>
                <th className="th">Budget</th>
                <th className="th">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {topMatches.map((m, i) => (
                <tr key={`${m.inventory_id}-${m.demand_id}-${i}`}>
                  <td className="td font-bold text-brand-700">{m.score.toFixed(2)}</td>
                  <td className="td">
                    <div className="font-medium">{m.inventory_device}</div>
                    <div className="text-xs text-gray-500">
                      <span className={`badge ${conditionColor[m.inventory_condition] ?? 'bg-gray-100'}`}>Grade {m.inventory_condition}</span>
                      <span className="ml-2">from {m.inventory_source ?? '—'}</span>
                    </div>
                  </td>
                  <td className="td">
                    <div className="font-medium">{m.demand_hospital}</div>
                    <div className="text-xs text-gray-500">{m.demand_country}</div>
                  </td>
                  <td className="td">{gbp(m.inventory_listed_gbp)}</td>
                  <td className="td"><span className={`badge ${budgetColor[m.demand_budget_tier] ?? 'bg-gray-100'}`}>{m.demand_budget_tier}</span></td>
                  <td className="td text-xs text-gray-600">{m.reasons.join(' · ')}</td>
                </tr>
              ))}
              {topMatches.length === 0 && (
                <tr><td colSpan={6} className="td text-center text-gray-500">No matches found. Acquire more stock or expand demand profiles.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demand markets grouped by country */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(byCountry).map(([country, hospitals]) => (
          <div key={country} className="card p-4">
            <h2 className="text-lg font-semibold">{country}</h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {hospitals.map(h => {
                const open = expanded === h.id;
                const hMatches = matchesByDemand[h.id] ?? [];
                return (
                  <li key={h.id} className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{h.hospital_name}</div>
                      <span className={`badge ${budgetColor[h.budget_tier] ?? 'bg-gray-100 text-gray-700'}`}>{h.budget_tier} budget</span>
                      <span className="ml-auto text-xs text-gray-500">{hMatches.length} matches</span>
                      <button className="btn" onClick={() => setExpanded(open ? null : h.id)}>{open ? 'Hide' : 'Show'} matches</button>
                    </div>
                    <div className="text-sm text-gray-700">{h.needs}</div>
                    <div className="text-xs text-gray-500">{h.contact_name} · {h.contact_email}</div>
                    {open && (
                      <ul className="mt-2 space-y-1">
                        {hMatches.length === 0 && <li className="text-xs text-gray-500">No matching stock currently.</li>}
                        {hMatches.map(m => (
                          <li key={m.inventory_id} className="rounded bg-gray-50 px-2 py-1 text-xs">
                            <span className="font-medium">{m.inventory_device}</span> · Grade {m.inventory_condition} · {gbp(m.inventory_listed_gbp)} · score <span className="font-bold text-brand-700">{m.score.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
