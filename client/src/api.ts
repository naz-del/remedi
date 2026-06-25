function authHeaders(): HeadersInit {
  const t = localStorage.getItem('remedi.token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  dashboard: () => get<DashboardStats>('/api/dashboard'),
  regions: () => get<Region[]>('/api/regions'),
  icbs: () => get<Icb[]>('/api/icbs'),
  categories: () => get<DeviceCategory[]>('/api/device-categories'),
  orgs: (params?: { region_id?: number; icb_id?: number }) =>
    get<OrgIcb[]>(`/api/orgs${qs(params)}`),
  site: (id: number) => get<SiteDetail>(`/api/sites/${id}`),
  replenishment: (params?: ReplenishmentFilters) =>
    get<ReplenishmentRow[]>(`/api/replenishment${qs(params)}`),
  inventory: (params?: { status?: string; destination_country?: string }) =>
    get<InventoryItem[]>(`/api/inventory${qs(params)}`),
  demandMarkets: () => get<DemandMarket[]>('/api/demand-markets'),
  manufacturers: () => get<Manufacturer[]>('/api/manufacturers'),
  dataPackages: () => get<DataPackage[]>('/api/data-packages'),
  pricePackage: (input: PriceInput) => post<PriceBreakdown>('/api/data-packages/price', input),
  bidTiming: (mfrId: number) => get<BidTimingResponse>(`/api/manufacturers/${mfrId}/bid-timing`),
  economics: () => get<EconomicsResponse>('/api/economics'),
  matches: () => get<Match[]>('/api/matches'),
  // Scoped (non-admin) endpoints
  meHospital: () => get<HospitalScope>('/api/me/hospital'),
  meManufacturer: () => get<ManufacturerScope>('/api/me/manufacturer'),
  authUsers: () => get<{ users: AuthUser[] }>('/api/auth/users'),
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'hospital' | 'manufacturer';
  scope_id: number | null;
  scope_name: string | null;
};

export type HospitalScope = {
  site: { id: number; name: string; city: string; postcode: string; bed_count: number; contact_name: string; contact_email: string; contact_phone: string; trust_name: string; icb_name: string; region_name: string };
  devices: { id: number; units: number; last_refresh_date: string; refresh_interval_years: number; category_id: number; category_name: string; avg_unit_value_gbp: number; next_refresh_date: string; days_until_refresh: number; replacement_value_gbp: number; estimated_divestment_gbp: number }[];
  summary: { devices: number; upcoming_90d: number; upcoming_365d: number; estimated_divestment_gbp: number; replacement_value_gbp: number };
  enquiries: { from: string; subject: string; status: string; value_gbp: number }[];
};

export type ManufacturerScope = {
  manufacturer: { id: number; name: string };
  summary: {
    interest_categories: string[]; interest_regions: string[];
    opportunities: number; bid_now_count: number; next_30d: number;
    total_pipeline_gbp: number; packages_owned: number; packages_spend_gbp: number;
  };
  opportunities: { id: number; units: number; site_id: number; site_name: string; city: string; trust_name: string; icb_name: string; region_name: string; category_name: string; next_refresh_date: string; recommended_bid_start: string; recommended_bid_close: string; days_until_refresh: number; est_deal_value_gbp: number }[];
  packages: { id: number; scope_description: string; exclusivity: string; price_gbp: number; status: string; sold_date: string | null; category_name: string | null; region_name: string | null; icb_name: string | null }[];
};

function qs(params?: Record<string, unknown>) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// ---- Types ----
export type DashboardStats = {
  trusts: number; sites: number;
  inventory_active: number; inventory_pipeline_value_gbp: number;
  data_intel_leads: number; data_packages_sold_value_gbp: number;
  upcoming_refreshes_90d: number; upcoming_refreshes_365d: number;
};
export type Region = { id: number; name: string; country: string };
export type Icb = { id: number; name: string; region_id: number; region_name: string; country: string; status: string; population: number; chair: string; ceo: string; notes: string };
export type DeviceCategory = { id: number; name: string; typical_refresh_years: number; avg_unit_value_gbp: number };
export type OrgIcb = Icb & { trusts: { id: number; name: string; type: string; icb_id: number; sites: { id: number; name: string; city: string; postcode: string; bed_count: number }[] }[] };
export type SiteDetail = {
  id: number; name: string; city: string; postcode: string; bed_count: number;
  contact_name: string; contact_email: string; contact_phone: string;
  trust_name: string; icb_name: string; region_name: string; country: string;
  devices: { id: number; category_id: number; category_name: string; units: number; last_refresh_date: string; refresh_interval_years: number; next_refresh_date: string; avg_unit_value_gbp: number }[];
};
export type ReplenishmentFilters = { region_id?: number; icb_id?: number; trust_id?: number; category_id?: number; within_days?: number };
export type ReplenishmentRow = {
  id: number; units: number; last_refresh_date: string; refresh_interval_years: number;
  next_refresh_date: string; days_until_refresh: number;
  site_id: number; site_name: string; city: string;
  trust_id: number; trust_name: string;
  icb_id: number; icb_name: string;
  region_id: number; region_name: string; country: string;
  category_id: number; category_name: string; avg_unit_value_gbp: number;
  est_refresh_spend_gbp: number;
};
export type InventoryItem = {
  id: number; device_type: string; category_id: number | null;
  source_site_id: number | null; source_site_name: string | null; trust_name: string | null;
  condition_grade: string; acquisition_cost_gbp: number; listed_price_gbp: number | null;
  status: string; destination_country: string | null; acquired_date: string; sold_date: string | null;
};
export type DemandMarket = { id: number; country: string; hospital_name: string; needs: string; budget_tier: string; contact_name: string; contact_email: string };
export type Manufacturer = { id: number; name: string; contact_name: string; contact_email: string; interest_categories: string[]; interest_regions: string[]; interest_icbs: string[] };
export type DataPackage = {
  id: number; manufacturer_id: number; manufacturer_name: string;
  category_id: number | null; category_name: string | null;
  region_id: number | null; region_name: string | null;
  icb_id: number | null; icb_name: string | null;
  scope_description: string; exclusivity: string; price_gbp: number; status: string; sold_date: string | null;
};
export type PriceInput = { category_id?: number | null; region_id?: number | null; icb_id?: number | null; exclusivity: 'exclusive' | 'shared' };
export type PriceBreakdown = {
  sites_in_scope: number; devices_in_scope: number; avg_unit_value_gbp: number;
  avg_months_to_refresh: number; base_gbp: number;
  urgency_multiplier: number; exclusivity_multiplier: number;
  suggested_price_gbp: number; rationale: string[];
};
export type BidTimingResponse = {
  manufacturer: { id: number; name: string; interest_categories: string[]; interest_regions: string[]; interest_icbs: string[] };
  opportunities: {
    id: number; site_id: number; site_name: string; city: string;
    trust_name: string; icb_name: string; region_name: string;
    category_name: string; units: number;
    last_refresh_date: string; next_refresh_date: string;
    recommended_bid_start: string; recommended_bid_close: string;
    days_until_refresh: number; est_deal_value_gbp: number;
  }[];
};

export type EconomicsOverall = {
  items: number; total_acquisition_gbp: number;
  realised_revenue_gbp: number; realised_margin_gbp: number;
  implied_margin_pipeline_gbp: number;
  sold_count: number; shipped_count: number; listed_count: number;
  refurbishing_count: number; acquired_count: number;
};
export type EconBySourceIcb = { icb_id: number; icb_name: string; region_name: string; items: number; acquisition_gbp: number; listed_gbp: number; margin_gbp: number; margin_pct: number | null };
export type EconByDestination = { destination_country: string; items: number; sold: number; acquisition_gbp: number; listed_gbp: number; margin_gbp: number };
export type EconByCategory = { category_name: string; items: number; acquisition_gbp: number; margin_gbp: number; margin_pct: number | null };
export type EconomicsResponse = {
  overall: EconomicsOverall;
  by_source_icb: EconBySourceIcb[];
  by_destination: EconByDestination[];
  by_category: EconByCategory[];
};

export type Match = {
  inventory_id: number; inventory_device: string; inventory_status: string;
  inventory_condition: string; inventory_listed_gbp: number | null; inventory_source: string | null;
  demand_id: number; demand_hospital: string; demand_country: string;
  demand_budget_tier: string; demand_needs: string;
  score: number; reasons: string[];
};

export function gbp(n: number | null | undefined): string {
  if (n == null) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}
