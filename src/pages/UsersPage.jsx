import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './UsersPage.css';

const TIER_COLORS = {
    free: '#64748b',
    standard: '#f59e0b',
    plus: '#8b5cf6',
};

export default function UsersPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [roomCounts, setRoomCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [sortField, setSortField] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch users and rooms in parallel
                const [usersSnap, roomsSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'rooms')),
                ]);

                const list = usersSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.toDate?.() || null,
                    updatedAt: d.data().updatedAt?.toDate?.() || null,
                }));
                setUsers(list);

                // Build userId -> room count map from rooms' members arrays
                const counts = {};
                roomsSnap.docs.forEach(d => {
                    const members = d.data().members || [];
                    members.forEach(uid => {
                        counts[uid] = (counts[uid] || 0) + 1;
                    });
                });
                setRoomCounts(counts);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = useMemo(() => {
        return users
            .filter(u => {
                if (tierFilter !== 'all' && (u.subscriptionTier || 'free') !== tierFilter) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                    u.displayName?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.phoneNumber?.toLowerCase().includes(q) ||
                    u.id.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                let valA, valB;
                if (sortField === 'createdAt') {
                    valA = a.createdAt?.getTime?.() || 0;
                    valB = b.createdAt?.getTime?.() || 0;
                } else if (sortField === 'rooms') {
                    valA = roomCounts[a.id] || 0;
                    valB = roomCounts[b.id] || 0;
                } else {
                    valA = (a[sortField] || '').toString().toLowerCase();
                    valB = (b[sortField] || '').toString().toLowerCase();
                }
                return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });
    }, [users, roomCounts, searchQuery, tierFilter, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }) => (
        <span className={`sort-icon ${sortField === field ? 'sort-active' : ''}`}>
            {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    const tierCounts = {
        all: users.length,
        free: users.filter(u => (u.subscriptionTier || 'free') === 'free').length,
        standard: users.filter(u => u.subscriptionTier === 'standard').length,
        plus: users.filter(u => u.subscriptionTier === 'plus').length,
    };

    if (loading) {
        return <div className="dashboard-loading"><div className="loader-ring" /><p>Loading users...</p></div>;
    }

    return (
        <div className="users-page">
            <div className="page-header">
                <h1 className="page-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    User Management
                </h1>
                <p className="page-subtitle">{users.length} registered users</p>
            </div>

            {/* Toolbar */}
            <div className="users-toolbar">
                <div className="search-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        type="text"
                        placeholder="Search by name, email, phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>}
                </div>
                <div className="filter-tabs">
                    {['all', 'free', 'standard', 'plus'].map(t => (
                        <button
                            key={t}
                            className={`filter-tab ${tierFilter === t ? 'filter-active' : ''}`}
                            onClick={() => setTierFilter(t)}
                        >
                            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                            <span className="filter-count">{tierCounts[t]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="empty-state animate-fade-in">
                    <h3>No users found</h3>
                    <p>{searchQuery ? 'Try a different search' : 'No users match this filter'}</p>
                </div>
            ) : (
                <div className="users-table-wrap animate-fade-in">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('displayName')}>User <SortIcon field="displayName" /></th>
                                <th onClick={() => handleSort('email')}>Email <SortIcon field="email" /></th>
                                <th>Phone</th>
                                <th>Tier</th>
                                <th onClick={() => handleSort('rooms')}>Rooms <SortIcon field="rooms" /></th>
                                <th onClick={() => handleSort('createdAt')}>Joined <SortIcon field="createdAt" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id} className="user-row" onClick={() => navigate(`/users/${u.id}`)}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-sm" style={{ background: `hsl(${(u.displayName?.charCodeAt(0) || 0) * 7}, 60%, 50%)` }}>
                                                {u.photoUrl ? (
                                                    <img src={u.photoUrl} alt="" />
                                                ) : (
                                                    u.displayName?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <span className="user-name">{u.displayName || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="user-email">{u.email || '—'}</td>
                                    <td className="user-phone">{u.phoneNumber || '—'}</td>
                                    <td>
                                        <span className="tier-badge" style={{ '--tier-color': TIER_COLORS[u.subscriptionTier || 'free'] }}>
                                            {(u.subscriptionTier || 'free').charAt(0).toUpperCase() + (u.subscriptionTier || 'free').slice(1)}
                                        </span>
                                    </td>
                                    <td className="user-rooms">{roomCounts[u.id] || 0}</td>
                                    <td className="user-date">{u.createdAt ? formatDistanceToNow(u.createdAt, { addSuffix: true }) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="table-footer">Showing {filtered.length} of {users.length} users</div>
        </div>
    );
}
