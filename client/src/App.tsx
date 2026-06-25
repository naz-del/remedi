import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orgs from './pages/Orgs';
import Radar from './pages/Radar';
import Inventory from './pages/Inventory';
import Demand from './pages/Demand';
import Leads from './pages/Leads';
import SiteDetail from './pages/SiteDetail';
import Economics from './pages/Economics';
import Login from './pages/Login';
import HospitalHome from './pages/HospitalHome';
import ManufacturerHome from './pages/ManufacturerHome';
import { Logo } from './components/Logo';
import { Icon } from './components/Icons';
import { AuthProvider, useAuth } from './auth';

const adminNav = [
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
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-ink-400">Loading…</div>;
  if (!user) {
    if (loc.pathname !== '/login') return <Navigate to="/login" replace />;
    return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Login />} /></Routes>;
  }
  if (loc.pathname === '/login') return <Navigate to="/" replace />;
  return <AuthedShell />;
}

function AuthedShell() {
  const { user } = useAuth();
  const nav = user!.role === 'admin' ? adminNav : [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Logo size={38} />
          {nav.length > 0 && (
            <nav className="flex flex-wrap items-center gap-1 ml-2">
              {nav.map(n => {
                const I = n.icon;
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                    <I size={15} />
                    {n.label}
                  </NavLink>
                );
              })}
            </nav>
          )}
          <UserChip />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Routes>
            {user!.role === 'admin' && (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orgs" element={<Orgs />} />
                <Route path="/sites/:id" element={<SiteDetail />} />
                <Route path="/radar" element={<Radar />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/economics" element={<Economics />} />
                <Route path="/demand" element={<Demand />} />
                <Route path="/leads" element={<Leads />} />
              </>
            )}
            {user!.role === 'hospital' && (
              <Route path="/" element={<HospitalHome />} />
            )}
            {user!.role === 'manufacturer' && (
              <Route path="/" element={<ManufacturerHome />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
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

function UserChip() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const roleColor =
    user.role === 'admin' ? 'bg-ink-900 text-white' :
    user.role === 'hospital' ? 'bg-brand-50 text-brand-700' :
    'bg-accent-50 text-accent-700';
  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'hospital' ? 'Hospital' : 'Manufacturer';
  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="hidden text-right md:block">
        <div className="text-sm font-medium leading-tight text-ink-900">{user.name}</div>
        <div className="text-[11px] leading-tight text-ink-400">{user.scope_name ?? 'All scopes'}</div>
      </div>
      <span className={`badge ${roleColor}`}>{roleLabel}</span>
      <button className="btn" onClick={() => logout()}>Sign out</button>
    </div>
  );
}
