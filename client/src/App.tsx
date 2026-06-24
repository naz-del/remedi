import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orgs from './pages/Orgs';
import Radar from './pages/Radar';
import Inventory from './pages/Inventory';
import Demand from './pages/Demand';
import Leads from './pages/Leads';
import SiteDetail from './pages/SiteDetail';
import Economics from './pages/Economics';
import { Logo } from './components/Logo';
import { Icon } from './components/Icons';

const nav = [
  { to: '/', label: 'Dashboard', end: true, icon: Icon.Dashboard },
  { to: '/orgs', label: 'Organisations', icon: Icon.Building },
  { to: '/radar', label: 'Radar', icon: Icon.Radar },
  { to: '/inventory', label: 'Inventory', icon: Icon.Box },
  { to: '/economics', label: 'Economics', icon: Icon.TrendUp },
  { to: '/demand', label: 'Demand', icon: Icon.Globe },
  { to: '/leads', label: 'Intelligence', icon: Icon.Spark },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Logo size={38} />
          <nav className="flex flex-wrap items-center gap-1 ml-2">
            {nav.map(n => {
              const I = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <I size={15} />
                  {n.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
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
      <footer className="border-t border-ink-100 bg-white/60 py-4 text-center text-xs text-ink-400">
        <span className="font-display font-medium text-ink-500">ReMedi</span> POC ·
        Local SQLite · NHS England structure snapshot 10 May 2026
      </footer>
    </div>
  );
}
