import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import './UserDetailPage.css';

const TIER_COLORS = { free: '#64748b', standard: '#f59e0b', plus: '#8b5cf6' };

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', id));
                if (snap.exists()) {
                    setUser({
                        id: snap.id,
                        ...snap.data(),
                        createdAt: snap.data().createdAt?.toDate?.() || null,
                        updatedAt: snap.data().updatedAt?.toDate?.() || null,
                        dateOfBirth: snap.data().dateOfBirth?.toDate?.() || null,
                    });

                    // Fetch rooms where this user is a member
                    // Query rooms collection where members array contains this user's UID
                    const roomsQuery = query(
                        collection(db, 'rooms'),
                        where('members', 'array-contains', id)
                    );
                    const roomsSnap = await getDocs(roomsQuery);
                    setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                    // Fetch tokens
                    const tokensSnap = await getDocs(collection(db, 'users', id, 'tokens'));
                    setTokens(tokensSnap.docs.map(d => ({ id: d.id, ...d.data(), lastUsed: d.data().lastUsed?.toDate?.() })));
                }
            } catch (err) {
                console.error('Failed to fetch user:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    if (loading) return <div className="dashboard-loading"><div className="loader-ring" /><p>Loading user...</p></div>;
    if (!user) return <div className="detail-not-found"><h2>User not found</h2><button className="back-btn" onClick={() => navigate('/users')}>← Back to Users</button></div>;

    const tier = user.subscriptionTier || 'free';

    return (
        <div className="user-detail animate-fade-in">
            <div className="detail-topbar">
                <button className="back-btn" onClick={() => navigate('/users')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
                    Back to Users
                </button>
            </div>

            <div className="ud-grid">
                {/* Profile card */}
                <div className="ud-profile-card">
                    <div className="ud-avatar-large" style={{ background: `hsl(${(user.displayName?.charCodeAt(0) || 0) * 7}, 60%, 50%)` }}>
                        {user.photoUrl ? <img src={user.photoUrl} alt="" /> : (user.displayName?.[0]?.toUpperCase() || '?')}
                    </div>
                    <h2 className="ud-name">{user.displayName || 'Unknown'}</h2>
                    {user.tagline && <p className="ud-tagline">{user.tagline}</p>}
                    <span className="tier-badge" style={{ '--tier-color': TIER_COLORS[tier] }}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                    </span>

                    <div className="ud-info-grid">
                        <div className="ud-info-item">
                            <span className="ud-info-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
                            </span>
                            <span className="ud-info-text">{user.email || 'No email'}</span>
                        </div>
                        <div className="ud-info-item">
                            <span className="ud-info-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                            </span>
                            <span className="ud-info-text">{user.phoneNumber || 'No phone'}</span>
                        </div>
                        <div className="ud-info-item">
                            <span className="ud-info-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </span>
                            <span className="ud-info-text">Joined {user.createdAt ? format(user.createdAt, 'MMM d, yyyy') : '—'}</span>
                        </div>
                        {user.dateOfBirth && (
                            <div className="ud-info-item">
                                <span className="ud-info-icon">🎂</span>
                                <span className="ud-info-text">{format(user.dateOfBirth, 'MMM d, yyyy')}</span>
                            </div>
                        )}
                        <div className="ud-info-item">
                            <span className="ud-info-icon">🔑</span>
                            <span className="ud-info-text ud-uid">{user.id}</span>
                        </div>
                    </div>
                </div>

                {/* Right side */}
                <div className="ud-right">
                    {/* Notification settings */}
                    <div className="ud-card">
                        <h3 className="ud-card-title">Notification Settings</h3>
                        <div className="ud-settings-grid">
                            {[
                                ['Notifications', user.notificationsEnabled],
                                ['Task Reminders', user.taskRemindersEnabled],
                                ['Expense Reminders', user.expenseRemindersEnabled],
                                ['Chat Notifications', user.chatNotificationsEnabled],
                                ['Payment Alerts', user.expensePaymentAlertsEnabled],
                            ].map(([label, enabled]) => (
                                <div key={label} className="ud-setting-item">
                                    <span>{label}</span>
                                    <span className={`ud-setting-badge ${enabled !== false ? 'ud-on' : 'ud-off'}`}>
                                        {enabled !== false ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rooms */}
                    <div className="ud-card">
                        <h3 className="ud-card-title">Rooms ({rooms.length})</h3>
                        {rooms.length === 0 ? (
                            <p className="ud-empty">No rooms joined</p>
                        ) : (
                            <div className="ud-rooms-list">
                                {rooms.map(r => (
                                    <div key={r.id} className="ud-room-item" onClick={() => navigate(`/rooms/${r.id}`)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                        <span className="ud-room-name">{r.name || 'Unnamed'}</span>
                                        <span className="ud-room-members">{r.members?.length || 0} members</span>
                                        {r.settings?.isTrip && <span className="ud-trip-badge">Trip</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FCM Tokens */}
                    <div className="ud-card">
                        <h3 className="ud-card-title">Devices ({tokens.length})</h3>
                        {tokens.length === 0 ? (
                            <p className="ud-empty">No devices registered</p>
                        ) : (
                            <div className="ud-tokens-list">
                                {tokens.map(t => (
                                    <div key={t.id} className="ud-token-item">
                                        <span className="ud-token-platform">{t.platform || 'unknown'}</span>
                                        <span className="ud-token-id">{t.token?.slice(0, 24)}...</span>
                                        <span className="ud-token-time">{t.lastUsed ? formatDistanceToNow(t.lastUsed, { addSuffix: true }) : '—'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
