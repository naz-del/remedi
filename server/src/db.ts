import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In dev: server/src/db.ts → server/remedi.db
// After tsc: server/dist/db.js → server/remedi.db
// DB_PATH overrides (e.g. when mounting a persistent volume in production).
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../remedi.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS icbs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      region_id INTEGER NOT NULL REFERENCES regions(id),
      status TEXT NOT NULL,
      population INTEGER,
      chair TEXT,
      ceo TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS trusts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      icb_id INTEGER NOT NULL REFERENCES icbs(id),
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      trust_id INTEGER NOT NULL REFERENCES trusts(id),
      region_id INTEGER NOT NULL REFERENCES regions(id),
      city TEXT,
      postcode TEXT,
      bed_count INTEGER,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT
    );

    CREATE TABLE IF NOT EXISTS device_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      typical_refresh_years INTEGER NOT NULL,
      avg_unit_value_gbp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_devices (
      id INTEGER PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      category_id INTEGER NOT NULL REFERENCES device_categories(id),
      units INTEGER NOT NULL,
      last_refresh_date TEXT NOT NULL,
      refresh_interval_years INTEGER NOT NULL,
      UNIQUE(site_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY,
      device_type TEXT NOT NULL,
      category_id INTEGER REFERENCES device_categories(id),
      source_site_id INTEGER REFERENCES sites(id),
      condition_grade TEXT NOT NULL,
      acquisition_cost_gbp INTEGER NOT NULL,
      listed_price_gbp INTEGER,
      status TEXT NOT NULL,
      destination_country TEXT,
      acquired_date TEXT NOT NULL,
      sold_date TEXT
    );

    CREATE TABLE IF NOT EXISTS demand_markets (
      id INTEGER PRIMARY KEY,
      country TEXT NOT NULL,
      hospital_name TEXT NOT NULL,
      needs TEXT NOT NULL,
      budget_tier TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT
    );

    CREATE TABLE IF NOT EXISTS manufacturers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      contact_name TEXT,
      contact_email TEXT,
      interest_categories TEXT,
      interest_regions TEXT,
      interest_icbs TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      scope_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS data_packages (
      id INTEGER PRIMARY KEY,
      manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id),
      category_id INTEGER REFERENCES device_categories(id),
      region_id INTEGER REFERENCES regions(id),
      icb_id INTEGER REFERENCES icbs(id),
      scope_description TEXT NOT NULL,
      exclusivity TEXT NOT NULL,
      price_gbp INTEGER NOT NULL,
      status TEXT NOT NULL,
      sold_date TEXT
    );
  `);
}

export function isEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) AS n FROM regions').get() as { n: number };
  return row.n === 0;
}
