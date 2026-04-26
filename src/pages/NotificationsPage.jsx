import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { formatDistanceToNow } from 'date-fns';
import './NotificationsPage.css';

export default function NotificationsPage() {
    const [tab, setTab] = useState('broadcast');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    // For individual notification
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearch, setUserSearch] = useState('');

    // For room notification
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomSearch, setRoomSearch] = useState('');

    // History
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersSnap, roomsSnap, historySnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'rooms')),
                    getDocs(collection(db, 'admin_notifications')).catch(() => ({ docs: [] })),
                ]);
                setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                const hist = historySnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
                hist.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
                setHistory(hist);
            } catch (err) {
                console.error('Failed to load data:', err);
            }
        };
        fetchData();
    }, []);

    const filteredUsers = users.filter(u => {
        if (!userSearch.trim()) return true;
        const q = userSearch.toLowerCase();
        return u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }).slice(0, 10);

    const filteredRooms = rooms.filter(r => {
        if (!roomSearch.trim()) return true;
        return r.name?.toLowerCase().includes(roomSearch.toLowerCase());
    }).slice(0, 10);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            setStatus({ type: 'error', msg: 'Title and body are required' });
            return;
        }

        if (tab === 'individual' && !selectedUser) {
            setStatus({ type: 'error', msg: 'Please select a user' });
            return;
        }

        if (tab === 'room' && !selectedRoom) {
            setStatus({ type: 'error', msg: 'Please select a room' });
            return;
        }

        setSending(true);
        setStatus(null);

        try {
            const functions = getFunctions();
            const sendNotification = httpsCallable(functions, 'sendAdminNotification');

            const payload = {
                type: tab,
                title: title.trim(),
                body: body.trim(),
            };

            if (tab === 'individual') payload.userId = selectedUser.id;
            if (tab === 'room') payload.roomId = selectedRoom.id;

            const result = await sendNotification(payload);

            // Log to history
            await addDoc(collection(db, 'admin_notifications'), {
                type: tab,
                title: title.trim(),
                body: body.trim(),
                targetId: tab === 'individual' ? selectedUser?.id : tab === 'room' ? selectedRoom?.id : 'all',
                targetName: tab === 'individual' ? selectedUser?.displayName : tab === 'room' ? selectedRoom?.name : 'All Users',
                sent: result.data?.sent || 0,
                createdAt: serverTimestamp(),
            });

            setStatus({
                type: 'success',
                msg: `✅ Notification sent! (${result.data?.sent || 0} devices reached)`
            });

            // Refresh history
            const histSnap = await getDocs(collection(db, 'admin_notifications')).catch(() => ({ docs: [] }));
            const hist = histSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
            hist.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
            setHistory(hist);

            setTitle('');
            setBody('');
        } catch (err) {
            console.error('Send notification failed:', err);
            setStatus({
                type: 'error',
                msg: `Failed to send: ${err.message}. Make sure the sendAdminNotification Cloud Function is deployed.`
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="notifications-page">
            <div className="page-header">
                <h1 className="page-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                    Notification Campaigns
                </h1>
                <p className="page-subtitle">Send push notifications to users and rooms</p>
            </div>

            <div className="notif-layout">
                {/* Compose area */}
                <div className="notif-compose">
                    <div className="notif-tabs">
                        <button className={`notif-tab ${tab === 'broadcast' ? 'notif-tab-active' : ''}`} onClick={() => setTab('broadcast')}>
                            📢 Broadcast
                        </button>
                        <button className={`notif-tab ${tab === 'individual' ? 'notif-tab-active' : ''}`} onClick={() => setTab('individual')}>
                            👤 Individual
                        </button>
                        <button className={`notif-tab ${tab === 'room' ? 'notif-tab-active' : ''}`} onClick={() => setTab('room')}>
                            🏠 Room
                        </button>
                    </div>

                    <div className="notif-form">
                        {/* Target selector */}
                        {tab === 'individual' && (
                            <div className="notif-target">
                                <label>Select User</label>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    className="notif-search"
                                />
                                {selectedUser && (
                                    <div className="notif-selected">
                                        <span>📧 {selectedUser.displayName || selectedUser.email}</span>
                                        <button onClick={() => setSelectedUser(null)}>✕</button>
                                    </div>
                                )}
                                {userSearch && !selectedUser && (
                                    <div className="notif-dropdown">
                                        {filteredUsers.map(u => (
                                            <div key={u.id} className="notif-dropdown-item" onClick={() => { setSelectedUser(u); setUserSearch(''); }}>
                                                <span className="ndi-name">{u.displayName || 'Unknown'}</span>
                                                <span className="ndi-email">{u.email || u.phoneNumber || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'room' && (
                            <div className="notif-target">
                                <label>Select Room</label>
                                <input
                                    type="text"
                                    placeholder="Search rooms..."
                                    value={roomSearch}
                                    onChange={e => setRoomSearch(e.target.value)}
                                    className="notif-search"
                                />
                                {selectedRoom && (
                                    <div className="notif-selected">
                                        <span>🏠 {selectedRoom.name}</span>
                                        <button onClick={() => setSelectedRoom(null)}>✕</button>
                                    </div>
                                )}
                                {roomSearch && !selectedRoom && (
                                    <div className="notif-dropdown">
                                        {filteredRooms.map(r => (
                                            <div key={r.id} className="notif-dropdown-item" onClick={() => { setSelectedRoom(r); setRoomSearch(''); }}>
                                                <span className="ndi-name">{r.name || 'Unnamed'}</span>
                                                <span className="ndi-email">{r.members?.length || 0} members</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'broadcast' && (
                            <div className="notif-broadcast-info">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                This will send to <strong>all {users.length} users</strong> subscribed to the all_users topic
                            </div>
                        )}

                        <div className="notif-field">
                            <label>Title</label>
                            <input
                                type="text"
                                placeholder="Notification title..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className="notif-field">
                            <label>Message</label>
                            <textarea
                                placeholder="Notification body..."
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={4}
                                maxLength={500}
                            />
                            <span className="char-count">{body.length}/500</span>
                        </div>

                        {status && (
                            <div className={`notif-status notif-status-${status.type}`}>
                                {status.msg}
                            </div>
                        )}

                        <button className="notif-send-btn" onClick={handleSend} disabled={sending}>
                            {sending ? (
                                <><div className="btn-loader" /> Sending...</>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                                    Send Notification
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="notif-history">
                    <h3 className="nh-title">Campaign History</h3>
                    {history.length === 0 ? (
                        <p className="nh-empty">No notifications sent yet</p>
                    ) : (
                        <div className="nh-list">
                            {history.map(h => (
                                <div key={h.id} className="nh-item">
                                    <div className="nh-item-header">
                                        <span className={`nh-type nh-type-${h.type}`}>
                                            {h.type === 'broadcast' ? '📢' : h.type === 'individual' ? '👤' : '🏠'}
                                            {h.type}
                                        </span>
                                        <span className="nh-time">{h.createdAt ? formatDistanceToNow(h.createdAt, { addSuffix: true }) : '—'}</span>
                                    </div>
                                    <p className="nh-title-text">{h.title}</p>
                                    <p className="nh-body-text">{h.body}</p>
                                    <div className="nh-footer">
                                        <span className="nh-target">To: {h.targetName || 'All'}</span>
                                        {h.sent > 0 && <span className="nh-sent">{h.sent} delivered</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
