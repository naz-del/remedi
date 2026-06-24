# ReMedi

POC for a UK medical device reuse and resale business. NHS hospitals retire devices at end-of-cycle even when still functional; ReMedi acquires the surplus, refurbishes it, and resells into South Asia and the Far East. Second revenue line: cycle-data packages sold to medical device manufacturers timing their NHS bids.

This is a local-only proof-of-concept. Single SQLite DB, seeded with realistic UK data.

## Stack

- **Frontend** React 18 + Vite + TypeScript + Tailwind + React Router (port 5173)
- **Backend** Node + Express + better-sqlite3 + TypeScript (port 4000)
- **DB** SQLite file at `server/remedi.db`

## Run it

```bash
# From the project root
npm run install:all     # installs root, server, and client deps
npm --prefix server run seed    # creates and seeds server/remedi.db
npm run dev             # runs server (4000) and client (5173) together
```

Then open http://localhost:5173.

The Vite dev server proxies `/api/*` to the Express server, so the frontend just calls relative paths.

### Re-seeding

The seed script is idempotent — it skips if data is present. To re-seed:

```bash
rm server/remedi.db
npm --prefix server run seed
```

## Data model

```
regions (10)               NHS regions + devolved nations
  └─ icbs (25)             25 effective ICB entities + 3 devolved bodies
      └─ trusts            NHS Trusts / FTs / Health Boards / HSC Trusts
          └─ sites         Hospital sites (city, postcode, beds, contact)
              └─ site_devices  Per-category: units, last refresh, interval
                                 → computed next_refresh_date

device_categories          Infusion pump, ventilator, ultrasound, etc.
inventory_items            Acquired stock with status and destination
demand_markets             Buying hospitals in South Asia / Far East
manufacturers              Cycle-data buyers, with interest filters
data_packages              Cycle-data SKUs (sold or pipeline)
```

## ICB list

ICBs follow the NHS England 17 April 2026 list of **25 effective entities** (6 already legally merged, 9 clusters running with shared leadership, 16 solo ICBs awaiting Apr 2027 mergers). This means some legacy names from training-data hallucinations are absent — e.g. "NHS North West London ICB" no longer exists as a standalone; it merged into **West and North London ICB**.

Source for ICB names, status, populations and named leadership: `~/.claude/knowledge/uk-nhs/02-icb-entities.md` (snapshot 10 May 2026).

Devolved nations are present nominally (one trust per country) so regional filtering covers more than England:
- Scotland — NHS Greater Glasgow and Clyde
- Wales — Cardiff and Vale University Health Board
- Northern Ireland — Belfast HSC Trust

## Pricing model — cycle-data packages

A suggested price for a data package is computed server-side from the actual underlying NHS device-cycle data in scope. See `server/src/pricing.ts`:

```
suggested = base x urgency x exclusivity

base       = 0.5% of total category spend at refresh
           = devices_in_scope * avg_unit_value_gbp * 0.005

urgency    = 1.6  if avg months to next refresh <=  6
           = 1.3  if <= 12
           = 1.1  if <= 24
           = 1.0  otherwise

exclusivity = 2.2  if exclusive
            = 1.0  if shared
```

Clamped to GBP 2,500–250,000 for the POC. Rationale lines are returned with the price so the sales team can see why the model arrived at a number.

## Bid-timing view

For a chosen manufacturer, computes:

- All upcoming NHS refresh events that match the manufacturer's declared category and region interests
- Recommended bid window: opens 180 days before the refresh, closes 60 days before
- Estimated deal value per event (units * avg unit value)
- Highlights events currently inside the bid window

Lives inside `/leads` (Data intelligence). Click "Bid timing" on any manufacturer card.

## Features

| Route | What it does |
|---|---|
| `/` | Dashboard tiles: sites, trusts, refreshes due, pipeline value, data leads |
| `/orgs` | ICB → Trust → Site browser. Filter by region or ICB. Click a site for detail. |
| `/sites/:id` | Site detail: device categories with next-refresh dates colour-coded by urgency |
| `/radar` | Replenishment radar: filterable, sortable, soonest-first refresh events |
| `/inventory` | Acquired stock: status, condition grade, source, destination, costs |
| `/demand` | Destination hospitals grouped by country, with budget tier |
| `/leads` | Manufacturers, packages, **pricing calculator**, **bid-timing view** |

## API surface (Express, port 4000)

```
GET  /api/dashboard
GET  /api/regions
GET  /api/icbs
GET  /api/device-categories
GET  /api/orgs?region_id=&icb_id=
GET  /api/sites/:id
GET  /api/replenishment?region_id=&icb_id=&trust_id=&category_id=&within_days=
GET  /api/inventory?status=&destination_country=
GET  /api/demand-markets
GET  /api/manufacturers
GET  /api/data-packages
POST /api/data-packages/price       body: { category_id?, region_id?, icb_id?, exclusivity }
GET  /api/manufacturers/:id/bid-timing
```

## Deploying later

The split client/server design will host straightforwardly:
- Frontend → Vercel / Netlify (static build)
- Backend → Fly.io / Railway / Render with a persistent disk for SQLite (or swap better-sqlite3 for Postgres)

Nothing in the code is bound to localhost; switching SQLite → Postgres means changing only `server/src/db.ts`.
