import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orgs from './pages/Orgs';
import Radar from './pages/Radar';
import Inventory from './pages/Inventory';
import Demand from './pages/Demand';
import Leads from './pages/Leads';
import SiteDetail from './pages/SiteDetail';
import Economics from './pages/Economics';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/orgs', label: 'Organisations' },
  { to: '/radar', label: 'Replenishment radar' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/economics', label: 'Economics' },
  { to: '/demand', label: 'Demand markets' },
  { to: '/leads', label: 'Data intelligence' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">R</div>
            <div>
              <div className="text-sm font-bold leading-none">ReMedi</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">NHS medical device reuse POC</div>
            </div>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orgs" element={<Orgs />} />
            <Route path="/sites/:id" element={<SiteDetail />} />
            <Route path="/radar" element={<Radar />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/economics" element={<Economics />} />
            <Route path="/demand" element={<Demand />} />
            <Route path="/leads" element={<Leads />} />
          </Routes>
        </div>
      </main>
      <footer className="border-t border-gray-200 bg-white py-3 text-center text-xs text-gray-500">
        ReMedi POC · Local SQLite · Seed data drawn from NHS England structure (snapshot 10 May 2026)
      </footer>
    </div>
  );
}
