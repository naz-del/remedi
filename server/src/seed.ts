import { db, initSchema, isEmpty } from './db.js';

export function runSeed(): boolean {
  initSchema();
  if (!isEmpty()) return false;

const insertRegion = db.prepare('INSERT INTO regions (name, country) VALUES (?, ?)');
const insertIcb = db.prepare(
  'INSERT INTO icbs (name, region_id, status, population, chair, ceo, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const insertTrust = db.prepare('INSERT INTO trusts (name, icb_id, type) VALUES (?, ?, ?)');
const insertSite = db.prepare(
  'INSERT INTO sites (name, trust_id, region_id, city, postcode, bed_count, contact_name, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const insertCat = db.prepare(
  'INSERT INTO device_categories (name, typical_refresh_years, avg_unit_value_gbp) VALUES (?, ?, ?)'
);
const insertSiteDevice = db.prepare(
  'INSERT INTO site_devices (site_id, category_id, units, last_refresh_date, refresh_interval_years) VALUES (?, ?, ?, ?, ?)'
);
const insertInv = db.prepare(
  'INSERT INTO inventory_items (device_type, category_id, source_site_id, condition_grade, acquisition_cost_gbp, listed_price_gbp, status, destination_country, acquired_date, sold_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const insertDemand = db.prepare(
  'INSERT INTO demand_markets (country, hospital_name, needs, budget_tier, contact_name, contact_email) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertMfr = db.prepare(
  'INSERT INTO manufacturers (name, contact_name, contact_email, interest_categories, interest_regions, interest_icbs) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertPkg = db.prepare(
  'INSERT INTO data_packages (manufacturer_id, category_id, region_id, icb_id, scope_description, exclusivity, price_gbp, status, sold_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

function tx() {
  db.exec('BEGIN');
  try {
  // Regions
  const regions: Record<string, number> = {};
  for (const [name, country] of [
    ['North West', 'England'],
    ['North East and Yorkshire', 'England'],
    ['Midlands', 'England'],
    ['East of England', 'England'],
    ['London', 'England'],
    ['South East', 'England'],
    ['South West', 'England'],
    ['Scotland', 'Scotland'],
    ['Wales', 'Wales'],
    ['Northern Ireland', 'Northern Ireland'],
  ] as const) {
    const info = insertRegion.run(name, country);
    regions[name] = Number(info.lastInsertRowid);
  }

  // ICBs (authoritative names per NHS England 17 Apr 2026 list)
  const icbs: Record<string, number> = {};
  const icbRows: Array<[string, string, string, number, string, string, string]> = [
    ['West and North London ICB', 'London', 'merged', 4500000, 'Mike Bell', 'Katie Fisher (interim)', 'Largest ICB in England. Formed from NCL + NWL.'],
    ['North East London ICB', 'London', 'solo', 2000000, 'Dame Marie Gabriel CBE', 'Dr Nnenna Osuji', '8 boroughs.'],
    ['South East and South West London ICB', 'London', 'cluster', 3700000, 'Sir Richard Douglas CB', 'Andrew Bland', 'Cluster awaiting Apr 2027 formal merger.'],
    ['Greater Manchester ICB', 'North West', 'solo', 2900000, 'Sir Richard Leese', 'Prof Colin Scales (acting)', 'Most digitally mature ICB nationally.'],
    ['Cheshire and Merseyside ICB', 'North West', 'solo', 2700000, 'Sir David Henshaw (interim)', 'Liz Bishop (interim)', 'Both leadership positions interim.'],
    ['Lancashire and South Cumbria ICB', 'North West', 'solo', 1800000, 'Emma Woollet', 'Aaron Cummins', ''],
    ['West Yorkshire ICB', 'North East and Yorkshire', 'solo', 2400000, 'Mark Chamberlain', 'Jonathan Webb (interim)', 'Strong PHM heritage (Bradford Improving Health).'],
    ['South Yorkshire ICB', 'North East and Yorkshire', 'solo', 1400000, 'Pearse Butler', 'Christopher Edwards', 'Mayor of South Yorkshire is ICP Chair.'],
    ['Humber and North Yorkshire ICB', 'North East and Yorkshire', 'solo', 1700000, 'Jason Stamp', 'Teresa Fenech', 'Actively investing in PHM tooling.'],
    ['North East and North Cumbria ICB', 'North East and Yorkshire', 'solo', 3200000, 'Prof Sir Liam Donaldson', 'Samantha Allen', ''],
    ['Birmingham, Solihull and Black Country ICB', 'Midlands', 'cluster', 3000000, 'Danielle Oum', 'David Melbourne', 'Cluster: B&S + Black Country.'],
    ['DLN ICB', 'Midlands', 'cluster', 3100000, 'Dr Kathy McLean OBE', 'Amanda Sullivan', 'Derby/Lincs/Nottingham. Already publishes joint commissioning plan.'],
    ['Coventry, Warwickshire, Herefordshire and Worcestershire ICB', 'Midlands', 'cluster', 2000000, 'Crishni Waring', 'Simon Trickett', ''],
    ['Central East ICB', 'East of England', 'merged', 3500000, 'Robin Porter', 'Jan Thomas', '2nd largest ICB in England.'],
    ['Norfolk and Suffolk ICB', 'East of England', 'merged', 1800000, 'Prof Will Pope', 'Ed Garratt', 'Digitally progressive CEO.'],
    ['Essex ICB', 'East of England', 'merged', 1900000, 'Prof Michael Thorne CBE', 'Tom Abell', ''],
    ['Kent and Medway ICB', 'South East', 'solo', 1900000, 'Angela McNab (interim)', 'Adam Doyle', ''],
    ['Hampshire and Isle of Wight ICB', 'South East', 'solo', 2000000, 'Lena Samuels', 'Maggie MacIsaac', ''],
    ['Surrey and Sussex ICB', 'South East', 'merged', 3000000, 'Ian Smith', 'Karen McDowell', ''],
    ['Thames Valley ICB', 'South East', 'merged', 2500000, 'Dr Priya Singh', 'Nick Broughton', 'Inherited Frimley PHM heritage.'],
    ['BNSSG and Gloucestershire ICB', 'South West', 'cluster', 1700000, 'Jeff Farrar', 'Shane Devlin', ''],
    ['Cornwall and Devon ICB', 'South West', 'cluster', 1800000, 'John Govett', 'Steve Moore / Mark Hackett', 'Shared chair, two CEOs.'],
    // Devolved nations - nominal entries
    ['NHS Greater Glasgow and Clyde', 'Scotland', 'health_board', 1200000, '', '', 'Scottish Health Board.'],
    ['Cardiff and Vale University Health Board', 'Wales', 'health_board', 500000, '', '', 'Welsh UHB.'],
    ['Belfast HSC Trust', 'Northern Ireland', 'hsc_trust', 350000, '', '', 'Health and Social Care Trust.'],
  ];
  for (const [name, region, status, pop, chair, ceo, notes] of icbRows) {
    const info = insertIcb.run(name, regions[region], status, pop, chair, ceo, notes);
    icbs[name] = Number(info.lastInsertRowid);
  }

  // Trusts
  const trusts: Record<string, { id: number; region: string }> = {};
  const trustRows: Array<[string, string, string]> = [
    // Greater Manchester
    ['Manchester University NHS Foundation Trust', 'Greater Manchester ICB', 'foundation'],
    ['Northern Care Alliance NHS Foundation Trust', 'Greater Manchester ICB', 'foundation'],
    // West Yorkshire
    ['Leeds Teaching Hospitals NHS Trust', 'West Yorkshire ICB', 'trust'],
    ['Bradford Teaching Hospitals NHS Foundation Trust', 'West Yorkshire ICB', 'foundation'],
    // South Yorkshire
    ['Sheffield Teaching Hospitals NHS Foundation Trust', 'South Yorkshire ICB', 'foundation'],
    // London - W&NL
    ['Imperial College Healthcare NHS Trust', 'West and North London ICB', 'trust'],
    ['London North West University Healthcare NHS Trust', 'West and North London ICB', 'trust'],
    // London - SE+SW
    ["Guy's and St Thomas' NHS Foundation Trust", 'South East and South West London ICB', 'foundation'],
    ["King's College Hospital NHS Foundation Trust", 'South East and South West London ICB', 'foundation'],
    // London - NEL
    ['Barts Health NHS Trust', 'North East London ICB', 'trust'],
    // Midlands
    ['University Hospitals Birmingham NHS Foundation Trust', 'Birmingham, Solihull and Black Country ICB', 'foundation'],
    ['Nottingham University Hospitals NHS Trust', 'DLN ICB', 'trust'],
    // South East
    ['East Kent Hospitals University NHS Foundation Trust', 'Kent and Medway ICB', 'foundation'],
    ['Oxford University Hospitals NHS Foundation Trust', 'Thames Valley ICB', 'foundation'],
    // East of England
    ['Cambridge University Hospitals NHS Foundation Trust', 'Central East ICB', 'foundation'],
    // South West
    ['University Hospitals Bristol and Weston NHS Foundation Trust', 'BNSSG and Gloucestershire ICB', 'foundation'],
    // North East
    ['Newcastle upon Tyne Hospitals NHS Foundation Trust', 'North East and North Cumbria ICB', 'foundation'],
    // Devolved nations
    ['Queen Elizabeth University Hospital', 'NHS Greater Glasgow and Clyde', 'health_board'],
    ['University Hospital of Wales', 'Cardiff and Vale University Health Board', 'health_board'],
    ['Royal Victoria Hospital Belfast', 'Belfast HSC Trust', 'hsc_trust'],
  ];
  for (const [name, icbName, type] of trustRows) {
    const info = insertTrust.run(name, icbs[icbName], type);
    const regionName = icbRows.find(r => r[0] === icbName)![1];
    trusts[name] = { id: Number(info.lastInsertRowid), region: regionName };
  }

  // Sites
  const sites: number[] = [];
  const siteRows: Array<[string, string, string, string, number, string, string, string]> = [
    ['Manchester Royal Infirmary', 'Manchester University NHS Foundation Trust', 'Manchester', 'M13 9WL', 750, 'Dr Sarah Khan', 'sarah.khan@mft.nhs.uk', '0161 276 1234'],
    ['Wythenshawe Hospital', 'Manchester University NHS Foundation Trust', 'Manchester', 'M23 9LT', 850, 'Mr Tom Whittaker', 'tom.whittaker@mft.nhs.uk', '0161 998 7070'],
    ['Salford Royal', 'Northern Care Alliance NHS Foundation Trust', 'Salford', 'M6 8HD', 600, 'Ms Aisha Patel', 'aisha.patel@nca.nhs.uk', '0161 789 7373'],
    ['Leeds General Infirmary', 'Leeds Teaching Hospitals NHS Trust', 'Leeds', 'LS1 3EX', 1100, 'Dr Mark Ellis', 'mark.ellis@nhs.net', '0113 243 2799'],
    ['St James University Hospital', 'Leeds Teaching Hospitals NHS Trust', 'Leeds', 'LS9 7TF', 1200, 'Dr Anjali Rao', 'anjali.rao@nhs.net', '0113 243 3144'],
    ['Bradford Royal Infirmary', 'Bradford Teaching Hospitals NHS Foundation Trust', 'Bradford', 'BD9 6RJ', 800, 'Mr Stephen Cole', 'stephen.cole@bthft.nhs.uk', '01274 542200'],
    ['Royal Hallamshire Hospital', 'Sheffield Teaching Hospitals NHS Foundation Trust', 'Sheffield', 'S10 2JF', 760, 'Dr Helen Brooks', 'helen.brooks@sth.nhs.uk', '0114 271 1900'],
    ['Northern General Hospital', 'Sheffield Teaching Hospitals NHS Foundation Trust', 'Sheffield', 'S5 7AU', 1100, 'Mr Daniel Singh', 'daniel.singh@sth.nhs.uk', '0114 243 4343'],
    ['St Marys Hospital London', 'Imperial College Healthcare NHS Trust', 'London', 'W2 1NY', 580, 'Dr Lila Hassan', 'lila.hassan@nhs.net', '020 3312 6666'],
    ['Charing Cross Hospital', 'Imperial College Healthcare NHS Trust', 'London', 'W6 8RF', 360, 'Mr Anthony Mukasa', 'a.mukasa@nhs.net', '020 3311 1234'],
    ['Northwick Park Hospital', 'London North West University Healthcare NHS Trust', 'Harrow', 'HA1 3UJ', 670, 'Ms Priya Shah', 'priya.shah@lnwh.nhs.uk', '020 8864 3232'],
    ["St Thomas' Hospital", "Guy's and St Thomas' NHS Foundation Trust", 'London', 'SE1 7EH', 840, 'Dr Olivia Mensah', 'olivia.mensah@gstt.nhs.uk', '020 7188 7188'],
    ["Guy's Hospital", "Guy's and St Thomas' NHS Foundation Trust", 'London', 'SE1 9RT', 400, 'Dr Peter Wong', 'peter.wong@gstt.nhs.uk', '020 7188 7188'],
    ["King's College Hospital Denmark Hill", "King's College Hospital NHS Foundation Trust", 'London', 'SE5 9RS', 950, 'Dr Yvonne Adusei', 'yvonne.adusei@nhs.net', '020 3299 9000'],
    ['Royal London Hospital', 'Barts Health NHS Trust', 'London', 'E1 1FR', 845, 'Mr Owen Carter', 'owen.carter@nhs.net', '020 7377 7000'],
    ['Queen Elizabeth Hospital Birmingham', 'University Hospitals Birmingham NHS Foundation Trust', 'Birmingham', 'B15 2GW', 1213, 'Dr Nadia Khan', 'nadia.khan@uhb.nhs.uk', '0121 627 2000'],
    ['Heartlands Hospital', 'University Hospitals Birmingham NHS Foundation Trust', 'Birmingham', 'B9 5SS', 850, 'Mr Liam ORourke', 'liam.orourke@uhb.nhs.uk', '0121 424 2000'],
    ['Queens Medical Centre Nottingham', 'Nottingham University Hospitals NHS Trust', 'Nottingham', 'NG7 2UH', 1300, 'Dr Sanjay Gupta', 'sanjay.gupta@nuh.nhs.uk', '0115 924 9924'],
    ['William Harvey Hospital', 'East Kent Hospitals University NHS Foundation Trust', 'Ashford', 'TN24 0LZ', 480, 'Ms Caroline Webb', 'caroline.webb@nhs.net', '01233 633331'],
    ['John Radcliffe Hospital', 'Oxford University Hospitals NHS Foundation Trust', 'Oxford', 'OX3 9DU', 1000, 'Dr Edward Pearson', 'edward.pearson@ouh.nhs.uk', '0300 304 7777'],
    ['Addenbrookes Hospital', 'Cambridge University Hospitals NHS Foundation Trust', 'Cambridge', 'CB2 0QQ', 1100, 'Dr Rachel Bennett', 'rachel.bennett@addenbrookes.nhs.uk', '01223 245151'],
    ['Bristol Royal Infirmary', 'University Hospitals Bristol and Weston NHS Foundation Trust', 'Bristol', 'BS2 8HW', 750, 'Mr James Holloway', 'james.holloway@uhbw.nhs.uk', '0117 923 0000'],
    ['Royal Victoria Infirmary Newcastle', 'Newcastle upon Tyne Hospitals NHS Foundation Trust', 'Newcastle', 'NE1 4LP', 850, 'Dr Catherine Reid', 'catherine.reid@nuth.nhs.uk', '0191 233 6161'],
    ['Queen Elizabeth University Hospital Glasgow', 'Queen Elizabeth University Hospital', 'Glasgow', 'G51 4TF', 1100, 'Dr Iain MacLeod', 'iain.macleod@ggc.scot.nhs.uk', '0141 201 1100'],
    ['University Hospital of Wales Cardiff', 'University Hospital of Wales', 'Cardiff', 'CF14 4XW', 1000, 'Dr Megan Davies', 'megan.davies@wales.nhs.uk', '029 2074 7747'],
    ['Royal Victoria Hospital Belfast', 'Royal Victoria Hospital Belfast', 'Belfast', 'BT12 6BA', 950, 'Dr Aoife Murphy', 'aoife.murphy@belfasttrust.hscni.net', '028 9024 0503'],
  ];
  for (const [name, trustName, city, postcode, beds, contact, email, phone] of siteRows) {
    const tr = trusts[trustName];
    const info = insertSite.run(name, tr.id, regions[tr.region], city, postcode, beds, contact, email, phone);
    sites.push(Number(info.lastInsertRowid));
  }

  // Device categories: name, refresh years, avg unit value
  const cats: Record<string, number> = {};
  const catRows: Array<[string, number, number]> = [
    ['Infusion pump', 7, 2500],
    ['Patient monitor', 8, 6500],
    ['Defibrillator', 8, 9000],
    ['Ventilator', 10, 22000],
    ['Ultrasound machine', 7, 45000],
    ['Anaesthetic machine', 12, 38000],
    ['ECG machine', 8, 4200],
    ['Syringe driver', 7, 1400],
    ['Hospital bed', 12, 4500],
    ['Surgical light', 15, 8500],
  ];
  for (const [name, years, value] of catRows) {
    const info = insertCat.run(name, years, value);
    cats[name] = Number(info.lastInsertRowid);
  }

  // Site devices - deterministic-ish spread across sites and categories so the demo has signal
  const today = new Date('2026-06-24');
  function dateOffsetYears(years: number): string {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - years);
    return d.toISOString().slice(0, 10);
  }
  function dateOffsetMonths(months: number): string {
    const d = new Date(today);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }
  const catNames = Object.keys(cats);
  for (let i = 0; i < sites.length; i++) {
    const siteId = sites[i];
    // each site gets 4-6 device categories
    const numCats = 4 + (i % 3);
    for (let j = 0; j < numCats; j++) {
      const catName = catNames[(i * 3 + j * 2) % catNames.length];
      const cat = catRows.find(r => r[0] === catName)!;
      const refreshYears = cat[1];
      // last refresh between (refreshYears - 1) and (refreshYears + 0.5) years ago, so next refresh lands soon-ish
      const yearsAgo = refreshYears - 1 + ((i + j) % 3) * 0.5;
      const lastRefresh = (() => {
        const d = new Date(today);
        d.setMonth(d.getMonth() - Math.round(yearsAgo * 12));
        return d.toISOString().slice(0, 10);
      })();
      const units = 8 + ((i + j * 7) % 40);
      try {
        insertSiteDevice.run(siteId, cats[catName], units, lastRefresh, refreshYears);
      } catch { /* unique constraint - skip dup category for same site */ }
    }
  }

  // Inventory items
  const conditions = ['A', 'B', 'B', 'C'];
  const statuses = ['acquired', 'refurbishing', 'listed', 'shipped', 'sold'];
  const destinations = ['India', 'Bangladesh', 'Pakistan', 'Nepal', 'Sri Lanka', 'Indonesia', 'Vietnam', 'Philippines', 'Thailand', 'Malaysia', null];
  for (let i = 0; i < 60; i++) {
    const cat = catRows[i % catRows.length];
    const sourceSite = sites[i % sites.length];
    const cond = conditions[i % conditions.length];
    const acqCost = Math.round(cat[2] * (0.18 + (i % 5) * 0.04));
    const listed = Math.round(acqCost * (1.6 + (i % 4) * 0.1));
    const status = statuses[i % statuses.length];
    const dest = status === 'shipped' || status === 'sold' ? destinations[i % (destinations.length - 1)] : null;
    const acquired = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 9 + 30));
      return d.toISOString().slice(0, 10);
    })();
    const sold = status === 'sold' ? (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 3));
      return d.toISOString().slice(0, 10);
    })() : null;
    insertInv.run(cat[0], cats[cat[0]], sourceSite, cond, acqCost, listed, status, dest, acquired, sold);
  }

  // Demand markets
  const demand: Array<[string, string, string, string, string, string]> = [
    ['India', 'Apollo Hospitals Chennai', 'Patient monitors, infusion pumps, ECG machines', 'mid', 'Dr Ravi Iyer', 'ravi.iyer@apollo.in'],
    ['India', 'Fortis Healthcare Mumbai', 'Defibrillators, ventilators', 'high', 'Dr Anita Sharma', 'anita.sharma@fortis.in'],
    ['Bangladesh', 'Square Hospital Dhaka', 'Ultrasound, anaesthetic machines, hospital beds', 'mid', 'Dr Tariq Rahman', 'tariq.rahman@squarehospital.com'],
    ['Bangladesh', 'United Hospital Dhaka', 'Patient monitors, infusion pumps', 'mid', 'Dr Naila Begum', 'naila.begum@uhlbd.com'],
    ['Pakistan', 'Aga Khan University Hospital Karachi', 'Ventilators, surgical lights', 'high', 'Dr Faisal Ahmed', 'faisal.ahmed@aku.edu'],
    ['Nepal', 'Norvic International Hospital Kathmandu', 'ECG machines, syringe drivers', 'low', 'Dr Sunita Thapa', 'sunita.thapa@norvic.com.np'],
    ['Sri Lanka', 'Asiri Surgical Hospital Colombo', 'Anaesthetic machines, surgical lights', 'mid', 'Dr Kamal Perera', 'kamal.perera@asirihealth.com'],
    ['Indonesia', 'Siloam Hospitals Jakarta', 'Patient monitors, defibrillators', 'mid', 'Dr Putri Wijaya', 'putri.wijaya@siloamhospitals.com'],
    ['Vietnam', 'Vinmec International Hospital Hanoi', 'Ultrasound, hospital beds', 'mid', 'Dr Linh Nguyen', 'linh.nguyen@vinmec.com'],
    ['Philippines', 'St Lukes Medical Center Manila', 'Infusion pumps, syringe drivers, ECG', 'mid', 'Dr Marco Reyes', 'marco.reyes@stlukes.com.ph'],
    ['Thailand', 'Bumrungrad International Bangkok', 'Anaesthetic machines, ventilators', 'high', 'Dr Anong Charoen', 'anong.charoen@bumrungrad.com'],
    ['Malaysia', 'KPJ Damansara Specialist Hospital', 'Surgical lights, defibrillators', 'mid', 'Dr Aishah Yusof', 'aishah.yusof@kpj.com.my'],
  ];
  for (const d of demand) insertDemand.run(...d);

  // Manufacturers (with JSON-encoded interests)
  const mfrIds: Record<string, number> = {};
  const mfrRows: Array<[string, string, string, string[], string[], string[]]> = [
    ['Medtronic UK', 'Sophie Allen', 'sophie.allen@medtronic.example', ['Infusion pump', 'Ventilator', 'Defibrillator'], ['North West', 'Midlands', 'London'], ['Greater Manchester ICB', 'West and North London ICB']],
    ['Philips Healthcare UK', 'Daniel Foster', 'daniel.foster@philips.example', ['Patient monitor', 'Ultrasound machine', 'ECG machine'], ['London', 'South East', 'East of England'], ['Central East ICB', 'Thames Valley ICB']],
    ['GE Healthcare UK', 'Helena Berg', 'helena.berg@ge.example', ['Anaesthetic machine', 'Ultrasound machine', 'Patient monitor'], ['North East and Yorkshire', 'Midlands'], ['West Yorkshire ICB', 'DLN ICB']],
    ['Draeger Medical UK', 'Stefan Krause', 'stefan.krause@draeger.example', ['Anaesthetic machine', 'Ventilator'], ['South West', 'South East'], ['BNSSG and Gloucestershire ICB', 'Surrey and Sussex ICB']],
    ['Mindray UK', 'Yuki Tanaka', 'yuki.tanaka@mindray.example', ['Patient monitor', 'Defibrillator', 'ECG machine'], ['North West', 'North East and Yorkshire'], ['Cheshire and Merseyside ICB', 'South Yorkshire ICB']],
    ['Stryker UK', 'Robert Hayes', 'robert.hayes@stryker.example', ['Hospital bed', 'Surgical light'], ['London', 'Midlands'], ['Birmingham, Solihull and Black Country ICB']],
    ['BD UK', 'Claire Whitfield', 'claire.whitfield@bd.example', ['Syringe driver', 'Infusion pump'], ['South East', 'East of England'], ['Kent and Medway ICB', 'Norfolk and Suffolk ICB']],
  ];
  for (const [name, contact, email, cats_, regs_, icbs_] of mfrRows) {
    const info = insertMfr.run(name, contact, email, JSON.stringify(cats_), JSON.stringify(regs_), JSON.stringify(icbs_));
    mfrIds[name] = Number(info.lastInsertRowid);
  }

  // Data packages - a mix of sold and pipeline
  const pkgRows: Array<[string, string | null, string | null, string | null, string, string, number, string, string | null]> = [
    ['Medtronic UK', 'Infusion pump', 'North West', null, 'Infusion pump refresh cycles across NW England', 'exclusive', 38000, 'sold', '2026-03-12'],
    ['Medtronic UK', 'Ventilator', null, 'Greater Manchester ICB', 'Ventilator cycle data for GM ICB', 'shared', 14000, 'pipeline', null],
    ['Philips Healthcare UK', 'Patient monitor', 'London', null, 'Patient monitor refresh cycles across London', 'exclusive', 62000, 'sold', '2026-04-08'],
    ['Philips Healthcare UK', 'Ultrasound machine', null, 'Central East ICB', 'Ultrasound refresh cycles in Central East', 'shared', 22000, 'pipeline', null],
    ['GE Healthcare UK', 'Anaesthetic machine', 'North East and Yorkshire', null, 'Anaesthetic refresh in NEY region', 'exclusive', 71000, 'sold', '2026-02-19'],
    ['Draeger Medical UK', 'Ventilator', 'South West', null, 'Ventilator cycle data SW England', 'shared', 18500, 'pipeline', null],
    ['Mindray UK', 'Defibrillator', null, 'Cheshire and Merseyside ICB', 'Defibrillator refresh in C&M ICB', 'exclusive', 28000, 'pipeline', null],
    ['BD UK', 'Syringe driver', 'South East', null, 'Syringe driver cycle data SE England', 'shared', 9500, 'sold', '2026-05-30'],
  ];
  for (const [mfrName, catName, regName, icbName, scope, excl, price, status, sold] of pkgRows) {
    insertPkg.run(
      mfrIds[mfrName],
      catName ? cats[catName] : null,
      regName ? regions[regName] : null,
      icbName ? icbs[icbName] : null,
      scope,
      excl,
      price,
      status,
      sold,
    );
  }

  // Users — seed accounts for the three POVs.
  const insertUser = db.prepare(
    'INSERT INTO users (email, password, name, role, scope_id) VALUES (?, ?, ?, ?, ?)'
  );
  const findSiteId = (name: string) => {
    const r = siteRows.findIndex(s => s[0] === name);
    return r >= 0 ? sites[r] : null;
  };
  // Admin
  insertUser.run('admin@remedi.uk', 'admin123', 'ReMedi Admin', 'admin', null);
  // Hospital users — one per site, demo two trusts
  insertUser.run('manchester@nhs.uk', 'nhs123', 'Dr Sarah Khan', 'hospital', findSiteId('Manchester Royal Infirmary'));
  insertUser.run('leeds@nhs.uk', 'nhs123', 'Dr Mark Ellis', 'hospital', findSiteId('Leeds General Infirmary'));
  insertUser.run('gstt@nhs.uk', 'nhs123', 'Dr Olivia Mensah', 'hospital', findSiteId("St Thomas' Hospital"));
  // Manufacturer users
  insertUser.run('sales@medtronic.example', 'mfr123', 'Sophie Allen', 'manufacturer', mfrIds['Medtronic UK']);
  insertUser.run('sales@philips.example', 'mfr123', 'Daniel Foster', 'manufacturer', mfrIds['Philips Healthcare UK']);
  insertUser.run('sales@ge.example', 'mfr123', 'Helena Berg', 'manufacturer', mfrIds['GE Healthcare UK']);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

  tx();
  return true;
}

/**
 * Idempotently ensure the seed user accounts exist. Useful when the users
 * table is added to a DB that already has the rest of the data populated
 * (e.g. an incremental schema migration on a running production instance).
 */
export function ensureUsers(): { added: number } {
  const userCount = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (userCount > 0) return { added: 0 };

  const insertUser = db.prepare(
    'INSERT INTO users (email, password, name, role, scope_id) VALUES (?, ?, ?, ?, ?)'
  );
  const siteId = (name: string) => {
    const r = db.prepare('SELECT id FROM sites WHERE name = ?').get(name) as any;
    return r?.id ?? null;
  };
  const mfrId = (name: string) => {
    const r = db.prepare('SELECT id FROM manufacturers WHERE name = ?').get(name) as any;
    return r?.id ?? null;
  };

  db.exec('BEGIN');
  try {
    insertUser.run('admin@remedi.uk', 'admin123', 'ReMedi Admin', 'admin', null);
    insertUser.run('manchester@nhs.uk', 'nhs123', 'Dr Sarah Khan', 'hospital', siteId('Manchester Royal Infirmary'));
    insertUser.run('leeds@nhs.uk', 'nhs123', 'Dr Mark Ellis', 'hospital', siteId('Leeds General Infirmary'));
    insertUser.run('gstt@nhs.uk', 'nhs123', 'Dr Olivia Mensah', 'hospital', siteId("St Thomas' Hospital"));
    insertUser.run('sales@medtronic.example', 'mfr123', 'Sophie Allen', 'manufacturer', mfrId('Medtronic UK'));
    insertUser.run('sales@philips.example', 'mfr123', 'Daniel Foster', 'manufacturer', mfrId('Philips Healthcare UK'));
    insertUser.run('sales@ge.example', 'mfr123', 'Helena Berg', 'manufacturer', mfrId('GE Healthcare UK'));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { added: 7 };
}

// CLI entry — `npm run seed`
import { fileURLToPath as _fu } from 'node:url';
if (process.argv[1] === _fu(import.meta.url)) {
  const seeded = runSeed();
  if (!seeded) {
    console.log('DB already seeded. To re-seed, delete server/remedi.db and re-run.');
  } else {
    console.log('Seed complete.');
    console.log(`Regions: ${(db.prepare('SELECT COUNT(*) AS n FROM regions').get() as any).n}`);
    console.log(`ICBs: ${(db.prepare('SELECT COUNT(*) AS n FROM icbs').get() as any).n}`);
    console.log(`Trusts: ${(db.prepare('SELECT COUNT(*) AS n FROM trusts').get() as any).n}`);
    console.log(`Sites: ${(db.prepare('SELECT COUNT(*) AS n FROM sites').get() as any).n}`);
    console.log(`Site devices: ${(db.prepare('SELECT COUNT(*) AS n FROM site_devices').get() as any).n}`);
    console.log(`Inventory: ${(db.prepare('SELECT COUNT(*) AS n FROM inventory_items').get() as any).n}`);
    console.log(`Demand markets: ${(db.prepare('SELECT COUNT(*) AS n FROM demand_markets').get() as any).n}`);
    console.log(`Manufacturers: ${(db.prepare('SELECT COUNT(*) AS n FROM manufacturers').get() as any).n}`);
    console.log(`Data packages: ${(db.prepare('SELECT COUNT(*) AS n FROM data_packages').get() as any).n}`);
  }
}
