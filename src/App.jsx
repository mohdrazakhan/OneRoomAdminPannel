import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import RoomsPage from './pages/RoomsPage';
import RoomDetailPage from './pages/RoomDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import CertificatesPage from './pages/CertificatesPage';
import DashboardPage from './pages/DashboardPage';
import BugDetailPage from './pages/BugDetailPage';
import ActivityPage from './pages/ActivityPage';
import PublicStatsPage from './pages/PublicStatsPage';
import { signOut } from 'firebase/auth';
import { auth } from './config/firebase';

function ProtectedRoute({ children, user, loading, isAdmin }) {
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg-root)',
                color: 'var(--text-muted)',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <div className="loader-ring" style={{
                    width: 40, height: 40,
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p>Checking authentication...</p>
            </div>
        );
    }

    // Not logged in → go to public page
    if (!user) return <Navigate to="/public" replace />;

    // Logged in but NOT admin → Access Denied
    if (!isAdmin) {
        return <AccessDenied />;
    }

    return children;
}

function AccessDenied() {
    useEffect(() => {
        // Auto sign-out non-admin users after 3 seconds
        const timer = setTimeout(() => {
            signOut(auth);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg-root)',
            color: 'var(--text-muted)',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'center',
            padding: '24px',
        }}>
            <div style={{ fontSize: '3rem' }}>🔒</div>
            <h2 style={{ color: '#f87171', margin: 0 }}>Access Denied</h2>
            <p style={{ maxWidth: 400 }}>Only <strong>admin@oneroom.living</strong> can access this panel. You are being signed out...</p>
        </div>
    );
}

function AdminLayout({ user, bugCounts, onBugCountsChange }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar
                user={user}
                bugCounts={bugCounts}
                isMobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
            />

            {/* Mobile hamburger */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(true)}
                style={{
                    display: 'none',
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 90,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    color: 'var(--text-secondary)',
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<OverviewPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/:id" element={<UserDetailPage />} />
                    <Route path="/rooms" element={<RoomsPage />} />
                    <Route path="/rooms/:id" element={<RoomDetailPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/bugs" element={<DashboardPage onBugCountsChange={onBugCountsChange} />} />
                    <Route path="/activity" element={<ActivityPage />} />
                    <Route path="/bugs/:id" element={<BugDetailPage />} />
                    {/* Legacy bug route redirect */}
                    <Route path="/bug/:id" element={<Navigate to="/bugs/:id" replace />} />
                </Routes>
            </main>

            <style>{`
                @media (max-width: 1024px) {
                    .mobile-menu-btn { display: flex !important; }
                }
            `}</style>
        </div>
    );
}

export default function App() {
    const { user, loading, isAdmin } = useAuth();
    const [bugCounts, setBugCounts] = useState({});
    const location = useLocation();

    // Public routes (no auth needed)
    if (location.pathname === '/public') {
        return <PublicStatsPage />;
    }

    if (location.pathname === '/login') {
        if (!loading && user && isAdmin) return <Navigate to="/" replace />;
        return <LoginPage />;
    }

    return (
        <ProtectedRoute user={user} loading={loading} isAdmin={isAdmin}>
            <AdminLayout
                user={user}
                bugCounts={bugCounts}
                onBugCountsChange={setBugCounts}
            />
        </ProtectedRoute>
    );
}
