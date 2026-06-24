import { db } from './db.js';

export type PricingInput = {
  category_id?: number | null;
  region_id?: number | null;
  icb_id?: number | null;
  exclusivity: 'exclusive' | 'shared';
  manufacturer_id?: number | null;
};

export type PricingBreakdown = {
  sites_in_scope: number;
  devices_in_scope: number;
  avg_unit_value_gbp: number;
  avg_months_to_refresh: number;
  base_gbp: number;
  urgency_multiplier: number;
  exclusivity_multiplier: number;
  suggested_price_gbp: number;
  rationale: string[];
};

/**
 * Cycle-data package pricing model.
 *
 * Suggested price = base x urgency x exclusivity, where:
 *   base                = 0.5% of total category-spend-at-refresh in scope
 *                       = sites_in_scope * units_per_site_avg * avg_unit_value * 0.005
 *   urgency_multiplier  = 1.6 if avg months to refresh <= 6, 1.3 if <=12, 1.1 if <=24, else 1.0
 *   exclusivity         = 2.2 for exclusive, 1.0 for shared
 *
 * Floor at GBP 2,500, ceiling at GBP 250,000 to keep POC sane.
 */
export function priceDataPackage(input: PricingInput): PricingBreakdown {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (input.category_id) { where.push('sd.category_id = @category_id'); params.category_id = input.category_id; }
  if (input.region_id) { where.push('s.region_id = @region_id'); params.region_id = input.region_id; }
  if (input.icb_id) { where.push('t.icb_id = @icb_id'); params.icb_id = input.icb_id; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const row = db.prepare(`
    SELECT
      COUNT(DISTINCT s.id) AS sites_in_scope,
      COALESCE(SUM(sd.units), 0) AS devices_in_scope,
      COALESCE(AVG(dc.avg_unit_value_gbp), 0) AS avg_unit_value_gbp,
      COALESCE(AVG(
        (julianday(date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')) - julianday('now')) / 30.0
      ), 36) AS avg_months_to_refresh
    FROM site_devices sd
    JOIN sites s ON s.id = sd.site_id
    JOIN trusts t ON t.id = s.trust_id
    JOIN device_categories dc ON dc.id = sd.category_id
    ${whereSql}
  `).get(params as any) as {
    sites_in_scope: number;
    devices_in_scope: number;
    avg_unit_value_gbp: number;
    avg_months_to_refresh: number;
  };

  const sites = row.sites_in_scope || 0;
  const devices = row.devices_in_scope || 0;
  const avgValue = Math.round(row.avg_unit_value_gbp || 0);
  const months = Math.max(0, Math.round(row.avg_months_to_refresh));

  const base = Math.round(devices * avgValue * 0.005);

  let urgency = 1.0;
  if (months <= 6) urgency = 1.6;
  else if (months <= 12) urgency = 1.3;
  else if (months <= 24) urgency = 1.1;

  const exclusivity = input.exclusivity === 'exclusive' ? 2.2 : 1.0;

  const raw = Math.round(base * urgency * exclusivity);
  const suggested = Math.max(2500, Math.min(250000, raw));

  const rationale: string[] = [];
  rationale.push(`${sites} site(s), ${devices} device(s) in scope.`);
  rationale.push(`Average unit value GBP ${avgValue.toLocaleString('en-GB')}.`);
  rationale.push(`Base = 0.5% of category spend at refresh = GBP ${base.toLocaleString('en-GB')}.`);
  rationale.push(`Avg months to next refresh: ${months} -> urgency x${urgency}.`);
  rationale.push(`${input.exclusivity === 'exclusive' ? 'Exclusive' : 'Shared'} licence -> x${exclusivity}.`);
  if (raw !== suggested) {
    rationale.push(`Clamped from GBP ${raw.toLocaleString('en-GB')} to POC range [2,500 - 250,000].`);
  }

  return {
    sites_in_scope: sites,
    devices_in_scope: devices,
    avg_unit_value_gbp: avgValue,
    avg_months_to_refresh: months,
    base_gbp: base,
    urgency_multiplier: urgency,
    exclusivity_multiplier: exclusivity,
    suggested_price_gbp: suggested,
    rationale,
  };
}
