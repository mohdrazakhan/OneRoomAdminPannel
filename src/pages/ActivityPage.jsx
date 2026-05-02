import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import './ActivityPage.css';

const ACTIVITY_TYPES = {
    expense: { icon: '💰', label: 'Expense', color: '#10b981' },
    room_created: { icon: '🏠', label: 'Room Created', color: '#06b6d4' },
    trip_created: { icon: '✈️', label: 'Trip Created', color: '#8b5cf6' },
    member_joined: { icon: '👤', label: 'Member Joined', color: '#818cf8' },
    message: { icon: '💬', label: 'Message', color: '#f59e0b' },
    task_created: { icon: '📋', label: 'Task', color: '#ec4899' },
};

export default function ActivityPage() {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [visibleCount, setVisibleCount] = useState(50);

    useEffect(() => {
        const fetchAllActivities = async () => {
            try {
                // Step 1: Fetch rooms + users in parallel
                const [roomsSnap, usersSnap] = await Promise.all([
                    getDocs(collection(db, 'rooms')),
                    getDocs(collection(db, 'users')),
                ]);

                const rooms = {};
                roomsSnap.docs.forEach(d => {
                    rooms[d.id] = { id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() };
                });

                const userMap = {};
                usersSnap.docs.forEach(d => {
                    const u = d.data();
                    userMap[d.id] = u.displayName || u.email || u.phoneNumber || 'Unknown User';
                });

                const allActivities = [];

                // Step 2: Room/Trip creation + member joined events (instant, no extra queries)
                Object.values(rooms).forEach(room => {
                    const isTrip = room.settings?.isTrip === true;
                    allActivities.push({
                        id: `room-${room.id}`,
                        type: isTrip ? 'trip_created' : 'room_created',
                        timestamp: room.createdAt || null,
                        userName: userMap[room.createdBy] || 'Someone',
                        userId: room.createdBy,
                        roomName: room.name || 'Unnamed Room',
                        roomId: room.id,
                        description: isTrip
                            ? `created a trip "${room.name || 'Unnamed Trip'}"`
                            : `created a room "${room.name || 'Unnamed Room'}"`,
                    });

                    (room.members || []).forEach(uid => {
                        if (uid === room.createdBy) return;
                        allActivities.push({
                            id: `member-${room.id}-${uid}`,
                            type: 'member_joined',
                            timestamp: room.createdAt || null,
                            userName: userMap[uid] || 'Someone',
                            userId: uid,
                            roomName: room.name || 'Unnamed Room',
                            roomId: room.id,
                            description: `joined the room "${room.name || 'Unnamed Room'}"`,
                        });
                    });
                });

                // Step 3: Fetch ALL subcollections from ALL rooms in ONE parallel burst
                // Instead of batching 10 at a time, fire all 138×3 = 414 queries at once
                // Firebase SDK handles connection pooling internally
                const roomIds = Object.keys(rooms);

                const subcollectionPromises = roomIds.flatMap(roomId => [
                    getDocs(collection(db, 'rooms', roomId, 'expenses')).then(snap => ({ roomId, type: 'expenses', snap })).catch(() => null),
                    getDocs(collection(db, 'rooms', roomId, 'tasks')).then(snap => ({ roomId, type: 'tasks', snap })).catch(() => null),
                    getDocs(collection(db, 'rooms', roomId, 'chats')).then(snap => ({ roomId, type: 'chats', snap })).catch(() => null),
                ]);

                const results = await Promise.all(subcollectionPromises);

                // Step 4: Process all results
                results.forEach(result => {
                    if (!result || !result.snap) return;
                    const { roomId, type, snap } = result;
                    const roomName = rooms[roomId]?.name || 'Unnamed Room';

                    snap.docs.forEach(d => {
                        const data = d.data();

                        if (type === 'expenses') {
                            allActivities.push({
                                id: `exp-${roomId}-${d.id}`,
                                type: 'expense',
                                timestamp: data.createdAt?.toDate?.() || null,
                                userName: userMap[data.paidBy] || 'Someone',
                                userId: data.paidBy,
                                roomName,
                                roomId,
                                amount: data.amount,
                                category: data.category,
                                description: `added an expense "${data.description || 'Untitled'}"`,
                                extra: data.description,
                            });
                        } else if (type === 'tasks') {
                            allActivities.push({
                                id: `task-${roomId}-${d.id}`,
                                type: 'task_created',
                                timestamp: data.createdAt?.toDate?.() || null,
                                userName: userMap[data.createdBy] || 'Someone',
                                userId: data.createdBy,
                                roomName,
                                roomId,
                                description: `created a task "${data.title || 'Untitled'}"`,
                                extra: data.title,
                            });
                        } else if (type === 'chats') {
                            const msgPreview = data.type === 'image' ? '📷 Image'
                                : data.type === 'file' ? '📎 File'
                                    : (data.text || data.message || '');
                            allActivities.push({
                                id: `msg-${roomId}-${d.id}`,
                                type: 'message',
                                timestamp: data.timestamp?.toDate?.() || null,
                                userName: data.senderName || userMap[data.senderId] || 'Someone',
                                userId: data.senderId,
                                roomName,
                                roomId,
                                description: `sent a message`,
                                msgPreview: msgPreview?.slice(0, 120),
                            });
                        }
                    });
                });

                // Sort by timestamp descending
                allActivities.sort((a, b) => {
                    const tA = a.timestamp?.getTime?.() || 0;
                    const tB = b.timestamp?.getTime?.() || 0;
                    return tB - tA;
                });

                setActivities(allActivities);
            } catch (err) {
                console.error('Failed to fetch activities:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllActivities();
    }, []);

    // ── Derived Data ──
    const filtered = useMemo(() => {
        if (filter === 'all') return activities;
        return activities.filter(a => a.type === filter);
    }, [activities, filter]);

    const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

    const counts = useMemo(() => {
        const c = { all: activities.length };
        activities.forEach(a => { c[a.type] = (c[a.type] || 0) + 1; });
        return c;
    }, [activities]);

    // ── Group by day ──
    const grouped = useMemo(() => {
        const groups = [];
        let currentDay = null;
        visible.forEach(item => {
            const ts = item.timestamp;
            if (!ts) {
                if (!currentDay || currentDay.label !== 'Unknown Date') {
                    currentDay = { label: 'Unknown Date', items: [] };
                    groups.push(currentDay);
                }
                currentDay.items.push(item);
                return;
            }
            const dayLabel = isToday(ts) ? 'Today'
                : isYesterday(ts) ? 'Yesterday'
                    : format(ts, 'EEEE, MMM d, yyyy');
            if (!currentDay || currentDay.label !== dayLabel) {
                currentDay = { label: dayLabel, items: [] };
                groups.push(currentDay);
            }
            currentDay.items.push(item);
        });
        return groups;
    }, [visible]);

    const handleItemClick = (item) => {
        if (item.roomId) navigate(`/rooms/${item.roomId}`);
        else if (item.userId) navigate(`/users/${item.userId}`);
    };

    // ── Render ──
    if (loading) {
        return (
            <div className="activity-page">
                <div className="page-header">
                    <h1 className="page-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
                        Recent Activity
                    </h1>
                    <p className="page-subtitle">Monitor all member activities across rooms</p>
                </div>
                <div className="activity-loading">
                    <div className="loader-ring" />
                    <p>Loading activity feed...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="activity-page">
            <div className="page-header">
                <h1 className="page-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
                    Recent Activity
                </h1>
                <p className="page-subtitle">Monitor all member activities across rooms</p>
            </div>

            {/* Summary Stats */}
            <div className="activity-stats-bar">
                {Object.entries(ACTIVITY_TYPES).map(([key, meta]) => (
                    <div key={key} className="activity-stat" onClick={() => setFilter(filter === key ? 'all' : key)} style={{ cursor: 'pointer' }}>
                        <span className="activity-stat-icon">{meta.icon}</span>
                        <div className="activity-stat-info">
                            <span className="activity-stat-num">{counts[key] || 0}</span>
                            <span className="activity-stat-label">{meta.label}s</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="activity-filters">
                <button
                    className={`activity-filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                    <span className="filter-count">{counts.all || 0}</span>
                </button>
                {Object.entries(ACTIVITY_TYPES).map(([key, meta]) => (
                    <button
                        key={key}
                        className={`activity-filter-btn ${filter === key ? 'active' : ''}`}
                        onClick={() => { setFilter(filter === key ? 'all' : key); setVisibleCount(50); }}
                    >
                        {meta.icon} {meta.label}
                        <span className="filter-count">{counts[key] || 0}</span>
                    </button>
                ))}
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="activity-empty">
                    <span className="activity-empty-icon">📭</span>
                    <span className="activity-empty-text">No activities found</span>
                </div>
            ) : (
                <>
                    <div className="activity-timeline">
                        {grouped.map(group => (
                            <div key={group.label}>
                                <div className="activity-day-header">{group.label}</div>
                                {group.items.map((item, idx) => {
                                    const meta = ACTIVITY_TYPES[item.type] || ACTIVITY_TYPES.room_created;
                                    return (
                                        <div
                                            key={item.id}
                                            className="activity-item"
                                            style={{ '--activity-color': meta.color, animationDelay: `${idx * 30}ms` }}
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <div className="activity-icon">
                                                {meta.icon}
                                            </div>
                                            <div className="activity-body">
                                                <p className="activity-description">
                                                    <strong>{item.userName}</strong> {item.description}
                                                </p>
                                                <div className="activity-detail">
                                                    <span className="activity-room-tag">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                                        {item.roomName}
                                                    </span>
                                                    {item.amount != null && (
                                                        <span className="activity-amount">₹{Number(item.amount).toLocaleString()}</span>
                                                    )}
                                                    {item.category && (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.category}</span>
                                                    )}
                                                </div>
                                                {item.msgPreview && (
                                                    <div className="activity-msg-preview">{item.msgPreview}</div>
                                                )}
                                            </div>
                                            <span className="activity-time">
                                                {item.timestamp ? formatDistanceToNow(item.timestamp, { addSuffix: true }) : '—'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {visibleCount < filtered.length && (
                        <div className="activity-load-more">
                            <button className="activity-load-more-btn" onClick={() => setVisibleCount(prev => prev + 50)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
                                Load more ({filtered.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
