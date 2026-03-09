import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FamilyDetailPage from './pages/FamilyDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner spinner-dark" /></div>;
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AppLayout() {
  const { operator, logout } = useAuth();
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname.startsWith('/family/')) return 'Family Details';
    return 'Digi SetuSeva';
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>🏛️ Digi SetuSeva</h1>
          <p>Operator Portal V1</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="icon">📊</span> Dashboard
          </NavLink>
          {/* Future nav items can be added here */}
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8 }}>
            <strong>{operator?.name}</strong>
            <br />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{operator?.kendra_name}</span>
          </div>
          <button className="btn btn-sm btn-outline" style={{ width: '100%', color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.15)' }} onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <h2>{getTitle()}</h2>
          <div className="top-bar-actions">
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              {operator?.email}
            </span>
          </div>
        </header>
        <div className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/family/:id" element={<FamilyDetailPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
