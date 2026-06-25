import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema, isEmpty } from './db.js';
import { priceDataPackage } from './pricing.js';
import { runSeed, ensureUsers } from './seed.js';
import { authMiddleware, login, logout, requireAuth, requireRole } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

initSchema();
if (isEmpty()) {
  console.log('[remedi] DB empty — auto-seeding…');
  runSeed();
  console.log('[remedi] Seed complete.');
} else {
  const u = ensureUsers();
  if (u.added > 0) console.log(`[remedi] Topped up ${u.added} demo user accounts on existing DB.`);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', authMiddleware);

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return; }
  const result = login(String(email).toLowerCase(), String(password));
  if (!result) { res.status(401).json({ error: 'invalid credentials' }); return; }
  res.json(result);
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer /i, '').trim();
  if (token) logout(token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// All other /api/* routes require admin role unless explicitly scoped under /api/me/*.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/me/')) return next();
  return requireRole('admin')(req, res, next);
});

// ---------- Scoped: hospital POV ----------
app.get('/api/me/hospital', requireAuth, requireRole('hospital'), (req, res) => {
  const siteId = req.user!.scope_id;
  if (!siteId) { res.status(400).json({ error: 'no site scope' }); return; }
  const site = db.prepare(`
    SELECT s.*, t.name AS trust_name, i.name AS icb_name, r.name AS region_name
    FROM sites s
    JOIN trusts t ON t.id = s.trust_id
    JOIN icbs i ON i.id = t.icb_id
    JOIN regions r ON r.id = s.region_id
    WHERE s.id = ?
  `).get(siteId) as any;
  const devices = db.prepare(`
    SELECT sd.id, sd.units, sd.last_refresh_date, sd.refresh_interval_years,
           dc.id AS category_id, dc.name AS category_name, dc.avg_unit_value_gbp,
           date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years') AS next_refresh_date,
           cast(julianday(date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')) - julianday('now') AS INTEGER) AS days_until_refresh,
           sd.units * dc.avg_unit_value_gbp AS replacement_value_gbp,
           round(sd.units * dc.avg_unit_value_gbp * 0.22) AS estimated_divestment_gbp
    FROM site_devices sd
    JOIN device_categories dc ON dc.id = sd.category_id
    WHERE sd.site_id = ?
    ORDER BY next_refresh_date
  `).all(siteId) as any[];
  const summary = {
    devices: devices.length,
    upcoming_90d: devices.filter(d => d.days_until_refresh >= 0 && d.days_until_refresh <= 90).length,
    upcoming_365d: devices.filter(d => d.days_until_refresh >= 0 && d.days_until_refresh <= 365).length,
    estimated_divestment_gbp: devices.reduce((s, d) => s + (d.estimated_divestment_gbp || 0), 0),
    replacement_value_gbp: devices.reduce((s, d) => s + (d.replacement_value_gbp || 0), 0),
  };
  // Mock pipeline of buyer enquiries to give the dashboard a sales-side narrative.
  const enquiries = [
    { from: 'ReMedi', subject: 'Pre-refresh offer: 12 patient monitors', status: 'awaiting your response', value_gbp: 18200 },
    { from: 'ReMedi', subject: 'End-of-cycle ultrasound bundle', status: 'quoted', value_gbp: 36500 },
    { from: 'ReMedi', subject: 'Quarterly statement', status: 'paid', value_gbp: 11400 },
  ];
  res.json({ site, devices, summary, enquiries });
});

// ---------- Scoped: manufacturer POV ----------
app.get('/api/me/manufacturer', requireAuth, requireRole('manufacturer'), (req, res) => {
  const mfrId = req.user!.scope_id;
  if (!mfrId) { res.status(400).json({ error: 'no manufacturer scope' }); return; }
  const mfr = db.prepare('SELECT * FROM manufacturers WHERE id = ?').get(mfrId) as any;
  const interestCats: string[] = mfr.interest_categories ? JSON.parse(mfr.interest_categories) : [];
  const interestRegions: string[] = mfr.interest_regions ? JSON.parse(mfr.interest_regions) : [];

  const opportunities = db.prepare(`
    SELECT sd.id, sd.units,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years') AS next_refresh_date,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years', '-180 days') AS recommended_bid_start,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years', '-60 days') AS recommended_bid_close,
      cast(julianday(date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')) - julianday('now') AS INTEGER) AS days_until_refresh,
      s.id AS site_id, s.name AS site_name, s.city,
      t.name AS trust_name,
      i.name AS icb_name,
      r.name AS region_name,
      dc.name AS category_name,
      sd.units * dc.avg_unit_value_gbp AS est_deal_value_gbp
    FROM site_devices sd
    JOIN sites s ON s.id = sd.site_id
    JOIN trusts t ON t.id = s.trust_id
    JOIN icbs i ON i.id = t.icb_id
    JOIN regions r ON r.id = s.region_id
    JOIN device_categories dc ON dc.id = sd.category_id
    WHERE (length(?) = 0 OR dc.name IN (SELECT value FROM json_each(?)))
      AND (length(?) = 0 OR r.name IN (SELECT value FROM json_each(?)))
    ORDER BY next_refresh_date
  `).all(
    JSON.stringify(interestCats), JSON.stringify(interestCats),
    JSON.stringify(interestRegions), JSON.stringify(interestRegions),
  ) as any[];

  const packages = db.prepare(`
    SELECT dp.*, dc.name AS category_name, r.name AS region_name, i.name AS icb_name
    FROM data_packages dp
    LEFT JOIN device_categories dc ON dc.id = dp.category_id
    LEFT JOIN regions r ON r.id = dp.region_id
    LEFT JOIN icbs i ON i.id = dp.icb_id
    WHERE dp.manufacturer_id = ?
    ORDER BY dp.status DESC, dp.price_gbp DESC
  `).all(mfrId);

  const now = Date.now();
  const summary = {
    interest_categories: interestCats,
    interest_regions: interestRegions,
    opportunities: opportunities.length,
    bid_now_count: opportunities.filter(o => new Date(o.recommended_bid_start).getTime() <= now && now <= new Date(o.recommended_bid_close).getTime()).length,
    next_30d: opportunities.filter(o => o.days_until_refresh >= 0 && o.days_until_refresh <= 30).length,
    total_pipeline_gbp: opportunities.reduce((s, o) => s + (o.est_deal_value_gbp || 0), 0),
    packages_owned: (packages as any[]).filter(p => p.status === 'sold').length,
    packages_spend_gbp: (packages as any[]).filter(p => p.status === 'sold').reduce((s, p) => s + p.price_gbp, 0),
  };
  res.json({ manufacturer: { id: mfr.id, name: mfr.name }, summary, opportunities, packages });
});

// ---------- Dashboard ----------
app.get('/api/dashboard', (_req, res) => {
  const trusts = (db.prepare('SELECT COUNT(*) AS n FROM trusts').get() as any).n;
  const sites = (db.prepare('SELECT COUNT(*) AS n FROM sites').get() as any).n;
  const inventoryActive = (db.prepare(
    "SELECT COUNT(*) AS n FROM inventory_items WHERE status IN ('acquired','refurbishing','listed','shipped')"
  ).get() as any).n;
  const inventoryPipelineValue = (db.prepare(
    "SELECT COALESCE(SUM(COALESCE(listed_price_gbp, acquisition_cost_gbp * 2)), 0) AS v FROM inventory_items WHERE status IN ('acquired','refurbishing','listed')"
  ).get() as any).v;
  const dataLeads = (db.prepare('SELECT COUNT(*) AS n FROM manufacturers').get() as any).n;
  const dataSold = (db.prepare("SELECT COALESCE(SUM(price_gbp),0) AS v FROM data_packages WHERE status='sold'").get() as any).v;
  const upcoming90 = (db.prepare(`
    SELECT COUNT(*) AS n
    FROM site_devices sd
    WHERE date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')
          BETWEEN date('now') AND date('now', '+90 days')
  `).get() as any).n;
  const upcoming365 = (db.prepare(`
    SELECT COUNT(*) AS n
    FROM site_devices sd
    WHERE date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')
          BETWEEN date('now') AND date('now', '+365 days')
  `).get() as any).n;
  res.json({
    trusts,
    sites,
    inventory_active: inventoryActive,
    inventory_pipeline_value_gbp: inventoryPipelineValue,
    data_intel_leads: dataLeads,
    data_packages_sold_value_gbp: dataSold,
    upcoming_refreshes_90d: upcoming90,
    upcoming_refreshes_365d: upcoming365,
  });
});

// ---------- Reference data ----------
app.get('/api/regions', (_req, res) => {
  res.json(db.prepare('SELECT * FROM regions ORDER BY country, name').all());
});

app.get('/api/icbs', (_req, res) => {
  res.json(db.prepare(`
    SELECT i.*, r.name AS region_name, r.country
    FROM icbs i
    JOIN regions r ON r.id = i.region_id
    ORDER BY r.country, r.name, i.name
  `).all());
});

app.get('/api/device-categories', (_req, res) => {
  res.json(db.prepare('SELECT * FROM device_categories ORDER BY name').all());
});

// ---------- Organisations browser ----------
app.get('/api/orgs', (req, res) => {
  const { region_id, icb_id } = req.query;
  const params: Record<string, unknown> = {};
  const where: string[] = [];
  if (region_id) { where.push('i.region_id = @region_id'); params.region_id = Number(region_id); }
  if (icb_id) { where.push('i.id = @icb_id'); params.icb_id = Number(icb_id); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const icbs = db.prepare(`
    SELECT i.*, r.name AS region_name, r.country
    FROM icbs i JOIN regions r ON r.id = i.region_id
    ${whereSql}
    ORDER BY r.country, r.name, i.name
  `).all(params as any) as any[];
  for (const icb of icbs) {
    icb.trusts = db.prepare('SELECT * FROM trusts WHERE icb_id = ? ORDER BY name').all(icb.id) as any[];
    for (const tr of icb.trusts) {
      tr.sites = db.prepare('SELECT * FROM sites WHERE trust_id = ? ORDER BY name').all(tr.id);
    }
  }
  res.json(icbs);
});

app.get('/api/sites/:id', (req, res) => {
  const id = Number(req.params.id);
  const site = db.prepare(`
    SELECT s.*, t.name AS trust_name, i.name AS icb_name, r.name AS region_name, r.country
    FROM sites s
    JOIN trusts t ON t.id = s.trust_id
    JOIN icbs i ON i.id = t.icb_id
    JOIN regions r ON r.id = s.region_id
    WHERE s.id = ?
  `).get(id) as any;
  if (!site) { res.status(404).json({ error: 'not found' }); return; }
  site.devices = db.prepare(`
    SELECT sd.id, sd.units, sd.last_refresh_date, sd.refresh_interval_years,
           dc.name AS category_name, dc.id AS category_id, dc.avg_unit_value_gbp,
           date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years') AS next_refresh_date
    FROM site_devices sd
    JOIN device_categories dc ON dc.id = sd.category_id
    WHERE sd.site_id = ?
    ORDER BY next_refresh_date
  `).all(id);
  res.json(site);
});

// ---------- Replenishment radar ----------
app.get('/api/replenishment', (req, res) => {
  const { region_id, icb_id, trust_id, category_id, within_days } = req.query;
  const params: Record<string, unknown> = {};
  const where: string[] = [];
  if (region_id) { where.push('s.region_id = @region_id'); params.region_id = Number(region_id); }
  if (icb_id) { where.push('t.icb_id = @icb_id'); params.icb_id = Number(icb_id); }
  if (trust_id) { where.push('s.trust_id = @trust_id'); params.trust_id = Number(trust_id); }
  if (category_id) { where.push('sd.category_id = @category_id'); params.category_id = Number(category_id); }
  if (within_days) {
    where.push(`date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years') <= date('now', '+' || @within_days || ' days')`);
    params.within_days = Number(within_days);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT
      sd.id, sd.units, sd.last_refresh_date, sd.refresh_interval_years,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years') AS next_refresh_date,
      cast(julianday(date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')) - julianday('now') AS INTEGER) AS days_until_refresh,
      s.id AS site_id, s.name AS site_name, s.city,
      t.id AS trust_id, t.name AS trust_name,
      i.id AS icb_id, i.name AS icb_name,
      r.id AS region_id, r.name AS region_name, r.country,
      dc.id AS category_id, dc.name AS category_name, dc.avg_unit_value_gbp,
      sd.units * dc.avg_unit_value_gbp AS est_refresh_spend_gbp
    FROM site_devices sd
    JOIN sites s ON s.id = sd.site_id
    JOIN trusts t ON t.id = s.trust_id
    JOIN icbs i ON i.id = t.icb_id
    JOIN regions r ON r.id = s.region_id
    JOIN device_categories dc ON dc.id = sd.category_id
    ${whereSql}
    ORDER BY next_refresh_date
  `).all(params as any);
  res.json(rows);
});

// ---------- Inventory ----------
app.get('/api/inventory', (req, res) => {
  const { status, destination_country } = req.query;
  const params: Record<string, unknown> = {};
  const where: string[] = [];
  if (status) { where.push('inv.status = @status'); params.status = String(status); }
  if (destination_country) { where.push('inv.destination_country = @destination_country'); params.destination_country = String(destination_country); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT inv.*, s.name AS source_site_name, t.name AS trust_name
    FROM inventory_items inv
    LEFT JOIN sites s ON s.id = inv.source_site_id
    LEFT JOIN trusts t ON t.id = s.trust_id
    ${whereSql}
    ORDER BY inv.acquired_date DESC
  `).all(params as any);
  res.json(rows);
});

// ---------- Demand markets ----------
app.get('/api/demand-markets', (_req, res) => {
  res.json(db.prepare('SELECT * FROM demand_markets ORDER BY country, hospital_name').all());
});

// ---------- Manufacturers + data packages ----------
app.get('/api/manufacturers', (_req, res) => {
  const rows = db.prepare('SELECT * FROM manufacturers ORDER BY name').all() as any[];
  for (const r of rows) {
    r.interest_categories = r.interest_categories ? JSON.parse(r.interest_categories) : [];
    r.interest_regions = r.interest_regions ? JSON.parse(r.interest_regions) : [];
    r.interest_icbs = r.interest_icbs ? JSON.parse(r.interest_icbs) : [];
  }
  res.json(rows);
});

app.get('/api/data-packages', (_req, res) => {
  res.json(db.prepare(`
    SELECT dp.*, m.name AS manufacturer_name,
           dc.name AS category_name, r.name AS region_name, i.name AS icb_name
    FROM data_packages dp
    JOIN manufacturers m ON m.id = dp.manufacturer_id
    LEFT JOIN device_categories dc ON dc.id = dp.category_id
    LEFT JOIN regions r ON r.id = dp.region_id
    LEFT JOIN icbs i ON i.id = dp.icb_id
    ORDER BY dp.status DESC, dp.price_gbp DESC
  `).all());
});

app.post('/api/data-packages/price', (req, res) => {
  const { category_id, region_id, icb_id, exclusivity } = req.body ?? {};
  if (exclusivity !== 'exclusive' && exclusivity !== 'shared') {
    res.status(400).json({ error: 'exclusivity must be "exclusive" or "shared"' });
    return;
  }
  res.json(priceDataPackage({
    category_id: category_id ? Number(category_id) : null,
    region_id: region_id ? Number(region_id) : null,
    icb_id: icb_id ? Number(icb_id) : null,
    exclusivity,
  }));
});

// ---------- Bid timing view ----------
app.get('/api/manufacturers/:id/bid-timing', (req, res) => {
  const mfrId = Number(req.params.id);
  const mfr = db.prepare('SELECT * FROM manufacturers WHERE id = ?').get(mfrId) as any;
  if (!mfr) { res.status(404).json({ error: 'not found' }); return; }
  const interestCats: string[] = mfr.interest_categories ? JSON.parse(mfr.interest_categories) : [];
  const interestRegions: string[] = mfr.interest_regions ? JSON.parse(mfr.interest_regions) : [];

  const rows = db.prepare(`
    SELECT
      sd.id,
      sd.units,
      sd.last_refresh_date,
      sd.refresh_interval_years,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years') AS next_refresh_date,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years', '-180 days') AS recommended_bid_start,
      date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years', '-60 days') AS recommended_bid_close,
      cast(julianday(date(sd.last_refresh_date, '+' || sd.refresh_interval_years || ' years')) - julianday('now') AS INTEGER) AS days_until_refresh,
      s.id AS site_id, s.name AS site_name, s.city,
      t.name AS trust_name,
      i.name AS icb_name,
      r.name AS region_name,
      dc.name AS category_name,
      sd.units * dc.avg_unit_value_gbp AS est_deal_value_gbp
    FROM site_devices sd
    JOIN sites s ON s.id = sd.site_id
    JOIN trusts t ON t.id = s.trust_id
    JOIN icbs i ON i.id = t.icb_id
    JOIN regions r ON r.id = s.region_id
    JOIN device_categories dc ON dc.id = sd.category_id
    WHERE (
      length(?) = 0
      OR dc.name IN (SELECT value FROM json_each(?))
    )
    AND (
      length(?) = 0
      OR r.name IN (SELECT value FROM json_each(?))
    )
    ORDER BY next_refresh_date
  `).all(
    JSON.stringify(interestCats), JSON.stringify(interestCats),
    JSON.stringify(interestRegions), JSON.stringify(interestRegions),
  );

  res.json({
    manufacturer: {
      id: mfr.id,
      name: mfr.name,
      interest_categories: interestCats,
      interest_regions: interestRegions,
      interest_icbs: mfr.interest_icbs ? JSON.parse(mfr.interest_icbs) : [],
    },
    opportunities: rows,
  });
});

// ---------- Sourcing economics ----------
app.get('/api/economics', (_req, res) => {
  // Per-item margin: realized for sold, implied (listed - acquisition) otherwise.
  const overall = db.prepare(`
    SELECT
      COUNT(*) AS items,
      COALESCE(SUM(acquisition_cost_gbp), 0) AS total_acquisition_gbp,
      COALESCE(SUM(CASE WHEN status='sold' THEN listed_price_gbp ELSE 0 END), 0) AS realised_revenue_gbp,
      COALESCE(SUM(CASE WHEN status='sold' THEN listed_price_gbp - acquisition_cost_gbp ELSE 0 END), 0) AS realised_margin_gbp,
      COALESCE(SUM(CASE WHEN status IN ('acquired','refurbishing','listed','shipped') THEN COALESCE(listed_price_gbp, acquisition_cost_gbp * 2) - acquisition_cost_gbp ELSE 0 END), 0) AS implied_margin_pipeline_gbp,
      SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END) AS sold_count,
      SUM(CASE WHEN status='shipped' THEN 1 ELSE 0 END) AS shipped_count,
      SUM(CASE WHEN status='listed' THEN 1 ELSE 0 END) AS listed_count,
      SUM(CASE WHEN status='refurbishing' THEN 1 ELSE 0 END) AS refurbishing_count,
      SUM(CASE WHEN status='acquired' THEN 1 ELSE 0 END) AS acquired_count
    FROM inventory_items
  `).get();

  const bySourceIcb = db.prepare(`
    SELECT
      i.id AS icb_id, i.name AS icb_name, r.name AS region_name,
      COUNT(inv.id) AS items,
      COALESCE(SUM(inv.acquisition_cost_gbp), 0) AS acquisition_gbp,
      COALESCE(SUM(COALESCE(inv.listed_price_gbp, inv.acquisition_cost_gbp * 2)), 0) AS listed_gbp,
      COALESCE(SUM(COALESCE(inv.listed_price_gbp, inv.acquisition_cost_gbp * 2) - inv.acquisition_cost_gbp), 0) AS margin_gbp,
      ROUND(
        100.0 * COALESCE(SUM(COALESCE(inv.listed_price_gbp, inv.acquisition_cost_gbp * 2) - inv.acquisition_cost_gbp), 0) /
        NULLIF(COALESCE(SUM(inv.acquisition_cost_gbp), 0), 0),
        1
      ) AS margin_pct
    FROM inventory_items inv
    JOIN sites s ON s.id = inv.source_site_id
    JOIN trusts t ON t.id = s.trust_id
    JOIN icbs i ON i.id = t.icb_id
    JOIN regions r ON r.id = s.region_id
    GROUP BY i.id
    ORDER BY margin_gbp DESC
  `).all();

  const byDestination = db.prepare(`
    SELECT
      COALESCE(destination_country, '(unassigned)') AS destination_country,
      COUNT(*) AS items,
      SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END) AS sold,
      COALESCE(SUM(acquisition_cost_gbp), 0) AS acquisition_gbp,
      COALESCE(SUM(COALESCE(listed_price_gbp, acquisition_cost_gbp * 2)), 0) AS listed_gbp,
      COALESCE(SUM(COALESCE(listed_price_gbp, acquisition_cost_gbp * 2) - acquisition_cost_gbp), 0) AS margin_gbp
    FROM inventory_items
    GROUP BY destination_country
    ORDER BY margin_gbp DESC
  `).all();

  const byCategory = db.prepare(`
    SELECT
      dc.name AS category_name,
      COUNT(inv.id) AS items,
      COALESCE(SUM(inv.acquisition_cost_gbp), 0) AS acquisition_gbp,
      COALESCE(SUM(COALESCE(inv.listed_price_gbp, inv.acquisition_cost_gbp * 2) - inv.acquisition_cost_gbp), 0) AS margin_gbp,
      ROUND(
        100.0 * COALESCE(SUM(COALESCE(inv.listed_price_gbp, inv.acquisition_cost_gbp * 2) - inv.acquisition_cost_gbp), 0) /
        NULLIF(COALESCE(SUM(inv.acquisition_cost_gbp), 0), 0),
        1
      ) AS margin_pct
    FROM inventory_items inv
    LEFT JOIN device_categories dc ON dc.id = inv.category_id
    GROUP BY dc.name
    ORDER BY margin_gbp DESC
  `).all();

  res.json({ overall, by_source_icb: bySourceIcb, by_destination: byDestination, by_category: byCategory });
});

// ---------- Match engine: inventory <-> demand ----------
// Budget bands cap acceptable per-item listed price.
const BUDGET_BAND_MAX: Record<string, number> = { low: 4000, mid: 18000, high: 60000 };

app.get('/api/matches', (_req, res) => {
  const inventory = db.prepare(`
    SELECT inv.*, s.name AS source_site_name, t.name AS trust_name
    FROM inventory_items inv
    LEFT JOIN sites s ON s.id = inv.source_site_id
    LEFT JOIN trusts t ON t.id = s.trust_id
    WHERE inv.status IN ('acquired','refurbishing','listed')
  `).all() as any[];
  const demand = db.prepare('SELECT * FROM demand_markets').all() as any[];

  type Match = {
    inventory_id: number;
    inventory_device: string;
    inventory_status: string;
    inventory_condition: string;
    inventory_listed_gbp: number | null;
    inventory_source: string | null;
    demand_id: number;
    demand_hospital: string;
    demand_country: string;
    demand_budget_tier: string;
    demand_needs: string;
    score: number;
    reasons: string[];
  };

  const matches: Match[] = [];
  for (const inv of inventory) {
    const listed = inv.listed_price_gbp ?? inv.acquisition_cost_gbp * 2;
    for (const d of demand) {
      const needsLower = d.needs.toLowerCase();
      const devLower = inv.device_type.toLowerCase();
      // category match by substring (handles plural "monitors" etc.)
      const stem = devLower.replace(/\s+/g, ' ').split(' ')[0];
      const typeMatch = needsLower.includes(devLower) || needsLower.includes(devLower + 's') || needsLower.includes(stem);
      if (!typeMatch) continue;

      const cap = BUDGET_BAND_MAX[d.budget_tier] ?? 0;
      const priceFits = listed <= cap;

      let score = 0.5;
      const reasons: string[] = [`"${inv.device_type}" matches "${d.needs}"`];
      if (priceFits) {
        score += 0.3;
        reasons.push(`Listed GBP ${listed.toLocaleString('en-GB')} within ${d.budget_tier}-tier cap GBP ${cap.toLocaleString('en-GB')}`);
      } else {
        reasons.push(`Price GBP ${listed.toLocaleString('en-GB')} exceeds ${d.budget_tier}-tier cap GBP ${cap.toLocaleString('en-GB')} (negotiate or downgrade target)`);
      }
      if (inv.condition_grade === 'A') { score += 0.2; reasons.push('Grade A condition'); }
      else if (inv.condition_grade === 'B') { score += 0.1; reasons.push('Grade B condition'); }
      // small bump for items already listed
      if (inv.status === 'listed') { score += 0.05; reasons.push('Already listed for sale'); }

      matches.push({
        inventory_id: inv.id,
        inventory_device: inv.device_type,
        inventory_status: inv.status,
        inventory_condition: inv.condition_grade,
        inventory_listed_gbp: inv.listed_price_gbp,
        inventory_source: inv.source_site_name,
        demand_id: d.id,
        demand_hospital: d.hospital_name,
        demand_country: d.country,
        demand_budget_tier: d.budget_tier,
        demand_needs: d.needs,
        score: Math.round(score * 100) / 100,
        reasons,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  res.json(matches);
});

// In production, serve the built React client and fall back to index.html for SPA routes.
if (isProduction) {
  // server/dist/index.js → ../../client/dist
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`[remedi] Serving client from ${clientDist}`);
}

// In dev the preview tool sets PORT for the Vite child, so the server uses API_PORT to avoid collision.
// In production there's only one process — honour PORT (Render et al set it).
const port = Number(isProduction
  ? (process.env.PORT || process.env.API_PORT)
  : process.env.API_PORT
) || 4000;

app.listen(port, () => {
  console.log(`[remedi] listening on http://localhost:${port}`);
});
