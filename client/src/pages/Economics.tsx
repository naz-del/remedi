import { useEffect, useState } from 'react';
import { api, EconomicsResponse, gbp } from '../api';
import { PageHeader } from '../components/PageHeader';

export default function Economics() {
  const [data, setData] = useState<EconomicsResponse | null>(null);
  useEffect(() => { api.economics().then(setData); }, []);
  if (!data) return <div className="text-gray-500">Loading economics…</div>;
  const { overall, by_source_icb, by_destination, by_category } = data;
  const totalLifecycleMargin = overall.realised_margin_gbp + overall.implied_margin_pipeline_gbp;
  const realisedMarginPct = overall.realised_revenue_gbp > 0
    ? Math.round(100 * overall.realised_margin_gbp / overall.realised_revenue_gbp)
    : 0;

  return (
    <div>
      <PageHeader title="Sourcing economics" subtitle="Per-item margin by source NHS ICB and destination country. Realised = sold; implied = listed minus acquisition for in-flight stock." icon="TrendUp" />

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="tile"><div className="tile-label">Total items</div><div className="tile-value">{overall.items}</div><div className="tile-sub">{overall.sold_count} sold · {overall.shipped_count + overall.listed_count + overall.refurbishing_count + overall.acquired_count} active</div></div>
        <div className="tile"><div className="tile-label">Acquisition spend</div><div className="tile-value">{gbp(overall.total_acquisition_gbp)}</div><div className="tile-sub">All-time</div></div>
        <div className="tile"><div className="tile-label">Realised margin</div><div className="tile-value text-accent-700">{gbp(overall.realised_margin_gbp)}</div><div className="tile-sub">{realisedMarginPct}% of realised revenue</div></div>
        <div className="tile"><div className="tile-label">Pipeline margin (implied)</div><div className="tile-value">{gbp(overall.implied_margin_pipeline_gbp)}</div><div className="tile-sub">Total lifecycle margin {gbp(totalLifecycleMargin)}</div></div>
      </div>

      {/* By source ICB */}
      <h2 className="mt-8 text-lg font-semibold">Margin by source ICB</h2>
      <p className="text-xs text-gray-500">Which NHS commissioning regions yield the best resale economics.</p>
      <div className="card mt-2 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Source ICB</th>
              <th className="th">Region</th>
              <th className="th text-right">Items</th>
              <th className="th text-right">Acquisition</th>
              <th className="th text-right">Listed</th>
              <th className="th text-right">Margin</th>
              <th className="th text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {by_source_icb.map(r => (
              <tr key={r.icb_id}>
                <td className="td font-medium">{r.icb_name}</td>
                <td className="td">{r.region_name}</td>
                <td className="td text-right">{r.items}</td>
                <td className="td text-right">{gbp(r.acquisition_gbp)}</td>
                <td className="td text-right">{gbp(r.listed_gbp)}</td>
                <td className="td text-right text-accent-700 font-medium">{gbp(r.margin_gbp)}</td>
                <td className="td text-right">{r.margin_pct == null ? '—' : `${r.margin_pct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By destination */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Margin by destination country</h2>
          <p className="text-xs text-gray-500">Where stock ends up. "(unassigned)" is acquired/listed stock with no destination yet.</p>
          <div className="card mt-2 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Destination</th>
                  <th className="th text-right">Items</th>
                  <th className="th text-right">Sold</th>
                  <th className="th text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {by_destination.map(r => (
                  <tr key={r.destination_country}>
                    <td className="td font-medium">{r.destination_country}</td>
                    <td className="td text-right">{r.items}</td>
                    <td className="td text-right">{r.sold}</td>
                    <td className="td text-right text-accent-700 font-medium">{gbp(r.margin_gbp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Margin by device category</h2>
          <p className="text-xs text-gray-500">Which categories are worth acquiring more of.</p>
          <div className="card mt-2 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Category</th>
                  <th className="th text-right">Items</th>
                  <th className="th text-right">Margin</th>
                  <th className="th text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {by_category.map(r => (
                  <tr key={r.category_name}>
                    <td className="td font-medium">{r.category_name}</td>
                    <td className="td text-right">{r.items}</td>
                    <td className="td text-right text-accent-700 font-medium">{gbp(r.margin_gbp)}</td>
                    <td className="td text-right">{r.margin_pct == null ? '—' : `${r.margin_pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
