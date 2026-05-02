import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import './Sidebar.css';

export default function Sidebar({ user, bugCounts, isMobileOpen, onCloseMobile }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const isBugFilterActive = (status) => {
        return location.pathname === '/bugs' && location.search === `?status=${status}`;
    };

    return (
        <>
            {isMobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}
            <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-brand">
                    <div className="sidebar-logo">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
                            <path d="M10 16.5C10 13.5 12.5 11 16 11C19.5 11 22 13.5 22 16.5C22 19.5 19.5 22 16 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="16" cy="16.5" r="2" fill="white"/>
                            <defs>
                                <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                                    <stop stopColor="#8e7cf0"/>
                                    <stop offset="1" stopColor="#674eeb"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div className="sidebar-brand-text">
                        <span className="sidebar-title">One Room</span>
                        <span className="sidebar-subtitle">Admin Panel</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <span className="sidebar-section-label">Main</span>

                    <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        <span>Overview</span>
                    </NavLink>

                    <span className="sidebar-section-label">Management</span>

                    <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                            <path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        <span>Users</span>
                    </NavLink>

                    <NavLink to="/rooms" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg>
                        <span>Rooms</span>
                    </NavLink>

                    <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 01-3.46 0"/>
                        </svg>
                        <span>Notifications</span>
                    </NavLink>

                    <NavLink to="/certificates" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span>Certificates</span>
                    </NavLink>

                    <span className="sidebar-section-label">Monitoring</span>

                    <NavLink to="/activity" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                        </svg>
                        <span>Activity</span>
                    </NavLink>

                    <span className="sidebar-section-label">Support</span>

                    <NavLink to="/bugs" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 016 0v1"/>
                            <path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z"/>
                            <path d="M12 20v2M6 13H2M22 13h-4M6 17l-2 2M18 17l2 2"/>
                        </svg>
                        <span>Bug Reports</span>
                        {bugCounts?.total > 0 && <span className="sidebar-count count-open">{bugCounts.total}</span>}
                    </NavLink>

                    {/* Bug status sub-links (only show when on bugs page) */}
                    {location.pathname.startsWith('/bug') && (
                        <div className="sidebar-sub-links">
                            <button className={`sidebar-link sidebar-sub ${isBugFilterActive('open') ? 'active' : ''}`} onClick={() => { navigate('/bugs?status=open'); onCloseMobile(); }}>
                                <span className="sidebar-dot dot-open" />
                                <span>Open</span>
                                {bugCounts?.open > 0 && <span className="sidebar-count count-open">{bugCounts.open}</span>}
                            </button>
                            <button className={`sidebar-link sidebar-sub ${isBugFilterActive('in-progress') ? 'active' : ''}`} onClick={() => { navigate('/bugs?status=in-progress'); onCloseMobile(); }}>
                                <span className="sidebar-dot dot-progress" />
                                <span>In Progress</span>
                                {bugCounts?.['in-progress'] > 0 && <span className="sidebar-count count-progress">{bugCounts['in-progress']}</span>}
                            </button>
                            <button className={`sidebar-link sidebar-sub ${isBugFilterActive('resolved') ? 'active' : ''}`} onClick={() => { navigate('/bugs?status=resolved'); onCloseMobile(); }}>
                                <span className="sidebar-dot dot-resolved" />
                                <span>Resolved</span>
                                {bugCounts?.resolved > 0 && <span className="sidebar-count count-resolved">{bugCounts.resolved}</span>}
                            </button>
                            <button className={`sidebar-link sidebar-sub ${isBugFilterActive('closed') ? 'active' : ''}`} onClick={() => { navigate('/bugs?status=closed'); onCloseMobile(); }}>
                                <span className="sidebar-dot dot-closed" />
                                <span>Closed</span>
                                {bugCounts?.closed > 0 && <span className="sidebar-count count-closed">{bugCounts.closed}</span>}
                            </button>
                        </div>
                    )}
                </nav>

                {/* User */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {user?.email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{user?.displayName || 'Admin'}</span>
                            <span className="sidebar-user-email">{user?.email}</span>
                        </div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} title="Sign out">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16,17 21,12 16,7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                    </button>
                </div>
            </aside>
        </>
    );
}
