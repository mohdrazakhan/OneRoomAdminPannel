import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './OverviewPage.css';

export default function OverviewPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, rooms: 0, bugs: 0, resolved: 0 });
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentBugs, setRecentBugs] = useState([]);
    const [recentRooms, setRecentRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch all users
                const usersSnap = await getDocs(collection(db, 'users'));
                const userCount = usersSnap.size;
                const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
                usersData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setRecentUsers(usersData.slice(0, 5));

                // Fetch all rooms
                const roomsSnap = await getDocs(collection(db, 'rooms'));
                const roomCount = roomsSnap.size;
                const roomsData = roomsSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
                roomsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setRecentRooms(roomsData.slice(0, 5));

                // Fetch all bugs
                const bugsSnap = await getDocs(collection(db, 'bug_reports'));
                const bugCount = bugsSnap.size;
                let resolvedCount = 0;
                const bugsData = bugsSnap.docs.map(d => {
                    const data = d.data();
                    if (data.status === 'resolved' || data.status === 'closed') resolvedCount++;
                    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() };
                });
                bugsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setRecentBugs(bugsData.slice(0, 5));

                // Count active users (those who are a member of at least 1 room)
                const activeUserIds = new Set();
                roomsData.forEach(r => {
                    (r.members || []).forEach(uid => activeUserIds.add(uid));
                });

                setStats({
                    users: userCount,
                    activeUsers: activeUserIds.size,
                    rooms: roomCount,
                    bugs: bugCount,
                    resolved: resolvedCount,
                });
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loader-ring" />
                <p>Loading overview...</p>
            </div>
        );
    }

    return (
        <div className="overview-page">
            <div className="page-header">
                <h1 className="page-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Dashboard Overview
                </h1>
                <p className="page-subtitle">Monitor your app's key metrics at a glance</p>
            </div>

            {/* Stats cards */}
            <div className="overview-stats">
                <div className="ov-stat-card" onClick={() => navigate('/users')}>
                    <div className="ov-stat-icon" style={{ '--accent': '#818cf8' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    </div>
                    <div className="ov-stat-info">
                        <span className="ov-stat-number">{stats.users}</span>
                        <span className="ov-stat-label">Total Users</span>
                    </div>
                    <span className="ov-stat-sub">{stats.activeUsers} active</span>
                </div>

                <div className="ov-stat-card" onClick={() => navigate('/rooms')}>
                    <div className="ov-stat-icon" style={{ '--accent': '#06b6d4' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                    </div>
                    <div className="ov-stat-info">
                        <span className="ov-stat-number">{stats.rooms}</span>
                        <span className="ov-stat-label">Total Rooms</span>
                    </div>
                </div>

                <div className="ov-stat-card" onClick={() => navigate('/bugs')}>
                    <div className="ov-stat-icon" style={{ '--accent': '#f59e0b' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 016 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z"/></svg>
                    </div>
                    <div className="ov-stat-info">
                        <span className="ov-stat-number">{stats.bugs}</span>
                        <span className="ov-stat-label">Bug Reports</span>
                    </div>
                    <span className="ov-stat-sub">{stats.bugs - stats.resolved} open</span>
                </div>

                <div className="ov-stat-card">
                    <div className="ov-stat-icon" style={{ '--accent': '#10b981' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                    </div>
                    <div className="ov-stat-info">
                        <span className="ov-stat-number">{stats.resolved}</span>
                        <span className="ov-stat-label">Resolved</span>
                    </div>
                    <span className="ov-stat-sub">{stats.bugs > 0 ? Math.round((stats.resolved / stats.bugs) * 100) : 0}% rate</span>
                </div>
            </div>

            {/* Activity sections */}
            <div className="overview-grid">
                {/* Recent Users */}
                <div className="ov-card">
                    <div className="ov-card-header">
                        <h3>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            Recent Users
                        </h3>
                        <button className="ov-view-all" onClick={() => navigate('/users')}>View all →</button>
                    </div>
                    <div className="ov-list">
                        {recentUsers.map(u => (
                            <div key={u.id} className="ov-list-item" onClick={() => navigate(`/users/${u.id}`)}>
                                <div className="ov-list-avatar" style={{ background: `hsl(${u.displayName?.charCodeAt(0) * 7 || 0}, 60%, 50%)` }}>
                                    {u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="ov-list-info">
                                    <span className="ov-list-name">{u.displayName || 'Unknown'}</span>
                                    <span className="ov-list-meta">{u.email || u.phoneNumber || '—'}</span>
                                </div>
                                <span className="ov-list-time">{u.createdAt ? formatDistanceToNow(u.createdAt, { addSuffix: true }) : '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Rooms */}
                <div className="ov-card">
                    <div className="ov-card-header">
                        <h3>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                            Recent Rooms
                        </h3>
                        <button className="ov-view-all" onClick={() => navigate('/rooms')}>View all →</button>
                    </div>
                    <div className="ov-list">
                        {recentRooms.map(r => (
                            <div key={r.id} className="ov-list-item" onClick={() => navigate(`/rooms/${r.id}`)}>
                                <div className="ov-list-avatar ov-list-avatar-room">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                </div>
                                <div className="ov-list-info">
                                    <span className="ov-list-name">{r.name || 'Unnamed Room'}</span>
                                    <span className="ov-list-meta">{r.members?.length || 0} members{r.settings?.isTrip ? ' · Trip' : ''}</span>
                                </div>
                                <span className="ov-list-time">{r.createdAt ? formatDistanceToNow(r.createdAt, { addSuffix: true }) : '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Bugs */}
                <div className="ov-card ov-card-full">
                    <div className="ov-card-header">
                        <h3>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 016 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z"/></svg>
                            Latest Bug Reports
                        </h3>
                        <button className="ov-view-all" onClick={() => navigate('/bugs')}>View all →</button>
                    </div>
                    <div className="ov-list">
                        {recentBugs.map(b => (
                            <div key={b.id} className="ov-list-item" onClick={() => navigate(`/bugs/${b.id}`)}>
                                <div className={`ov-bug-dot ov-bug-dot-${b.status || 'open'}`} />
                                <div className="ov-list-info">
                                    <span className="ov-list-name">{b.title}</span>
                                    <span className="ov-list-meta">{b.contact || '—'} · {b.status || 'open'}</span>
                                </div>
                                <span className="ov-list-time">{b.createdAt ? formatDistanceToNow(b.createdAt, { addSuffix: true }) : '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
