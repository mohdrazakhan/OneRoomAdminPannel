import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import './RoomDetailPage.css';

const CATEGORY_ICONS = { Food: '🍔', Groceries: '🛒', Utilities: '💡', Rent: '🏠', Transport: '🚗', Entertainment: '🎬', Cleaning: '🧹', Other: '📝' };

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
);

const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

export default function RoomDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('members');
    const [userMap, setUserMap] = useState({});
    const [toast, setToast] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, label }
    const [editModal, setEditModal] = useState(null); // { type: 'expense'|'task', data: {...} }
    const [editForm, setEditForm] = useState({});

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchRoom = useCallback(async () => {
        try {
            const snap = await getDoc(doc(db, 'rooms', id));
            if (!snap.exists()) { setLoading(false); return; }

            const data = { id: snap.id, ...snap.data(), createdAt: snap.data().createdAt?.toDate?.() };
            setRoom(data);

            const uMap = {};
            if (data.members?.length > 0) {
                const memberPromises = data.members.map(async uid => {
                    try {
                        const uSnap = await getDoc(doc(db, 'users', uid));
                        if (uSnap.exists()) {
                            const u = { id: uSnap.id, ...uSnap.data() };
                            uMap[uid] = u.displayName || u.email || 'Unknown';
                            return u;
                        }
                    } catch (e) { /* ignore */ }
                    uMap[uid] = 'Unknown User';
                    return { id: uid, displayName: 'Unknown User' };
                });
                setMembers(await Promise.all(memberPromises));
            }
            setUserMap(uMap);

            const [expSnap, taskSnap, chatSnap] = await Promise.all([
                getDocs(collection(db, 'rooms', id, 'expenses')).catch(() => ({ docs: [] })),
                getDocs(collection(db, 'rooms', id, 'tasks')).catch(() => ({ docs: [] })),
                getDocs(collection(db, 'rooms', id, 'chats')).catch(() => ({ docs: [] })),
            ]);

            const expList = expSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
            expList.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
            setExpenses(expList);

            const taskList = taskSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
            taskList.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
            setTasks(taskList);

            const chatList = chatSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() }));
            chatList.sort((a, b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0));
            setChats(chatList);
        } catch (err) {
            console.error('Failed to fetch room:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchRoom(); }, [fetchRoom]);

    const getName = (uid) => userMap[uid] || uid?.slice(0, 8) || '—';

    // ─── Admin Delete Actions ───
    const handleDeleteExpense = async (expenseId) => {
        try {
            await deleteDoc(doc(db, 'rooms', id, 'expenses', expenseId));
            setExpenses(prev => prev.filter(e => e.id !== expenseId));
            showToast('Expense deleted');
        } catch (err) {
            showToast('Failed: ' + err.message, 'error');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteDoc(doc(db, 'rooms', id, 'tasks', taskId));
            setTasks(prev => prev.filter(t => t.id !== taskId));
            showToast('Task deleted');
        } catch (err) {
            showToast('Failed: ' + err.message, 'error');
        }
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            await deleteDoc(doc(db, 'rooms', id, 'chats', msgId));
            setChats(prev => prev.filter(c => c.id !== msgId));
            showToast('Message deleted');
        } catch (err) {
            showToast('Failed: ' + err.message, 'error');
        }
    };

    const handleRemoveMember = async (uid) => {
        try {
            await updateDoc(doc(db, 'rooms', id), { members: arrayRemove(uid) });
            setMembers(prev => prev.filter(m => m.id !== uid));
            setRoom(prev => ({ ...prev, members: prev.members.filter(m => m !== uid) }));
            showToast('Member removed');
        } catch (err) {
            showToast('Failed: ' + err.message, 'error');
        }
    };

    const handleDeleteGuest = async (guestId) => {
        try {
            const guestsUpdate = { ...room.guests };
            delete guestsUpdate[guestId];
            await updateDoc(doc(db, 'rooms', id), { guests: guestsUpdate });
            setRoom(prev => ({ ...prev, guests: guestsUpdate }));
            showToast('Guest removed');
        } catch (err) {
            showToast('Failed: ' + err.message, 'error');
        }
    };

    const openEditExpense = (e) => {
        setEditForm({ description: e.description || '', amount: e.amount || '', category: e.category || 'Other', notes: e.notes || '' });
        setEditModal({ type: 'expense', id: e.id });
    };

    const openEditTask = (t) => {
        setEditForm({ title: t.title || '', description: t.description || '', frequency: t.frequency || '', isActive: t.isActive !== false });
        setEditModal({ type: 'task', id: t.id });
    };

    const handleSaveEdit = async () => {
        if (!editModal) return;
        try {
            if (editModal.type === 'expense') {
                const updates = { description: editForm.description, amount: Number(editForm.amount) || 0, category: editForm.category, notes: editForm.notes };
                await updateDoc(doc(db, 'rooms', id, 'expenses', editModal.id), updates);
                setExpenses(prev => prev.map(e => e.id === editModal.id ? { ...e, ...updates } : e));
            } else if (editModal.type === 'task') {
                const updates = { title: editForm.title, description: editForm.description, frequency: editForm.frequency, isActive: editForm.isActive };
                await updateDoc(doc(db, 'rooms', id, 'tasks', editModal.id), updates);
                setTasks(prev => prev.map(t => t.id === editModal.id ? { ...t, ...updates } : t));
            }
            setEditModal(null);
            showToast(`${editModal.type === 'expense' ? 'Expense' : 'Task'} updated`);
        } catch (err) {
            showToast('Failed: ' + err.message, 'error');
        }
    };

    const executeConfirm = () => {
        if (!confirmDelete) return;
        const { type, id: itemId } = confirmDelete;
        if (type === 'expense') handleDeleteExpense(itemId);
        else if (type === 'task') handleDeleteTask(itemId);
        else if (type === 'message') handleDeleteMessage(itemId);
        else if (type === 'member') handleRemoveMember(itemId);
        else if (type === 'guest') handleDeleteGuest(itemId);
        setConfirmDelete(null);
    };

    if (loading) return <div className="dashboard-loading"><div className="loader-ring" /><p>Loading room...</p></div>;
    if (!room) return <div className="detail-not-found"><h2>Room not found</h2><button className="back-btn" onClick={() => navigate('/rooms')}>← Back to Rooms</button></div>;

    const isTrip = room.settings?.isTrip === true;
    const guests = room.guests ? Object.entries(room.guests).filter(([, v]) => v?.isActive !== false) : [];
    const totalExpenseAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const tabs = [
        { key: 'members', label: 'Members', count: members.length },
        { key: 'expenses', label: 'Expenses', count: expenses.length },
        { key: 'tasks', label: 'Tasks', count: tasks.length },
        { key: 'messages', label: 'Messages', count: chats.length },
        ...(guests.length > 0 ? [{ key: 'guests', label: 'Guests', count: guests.length }] : []),
        { key: 'info', label: 'Info', count: null },
    ];

    return (
        <div className="room-detail animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className={`rd-toast rd-toast-${toast.type}`}>
                    {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="rd-modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="rd-modal" onClick={e => e.stopPropagation()}>
                        <h3>Confirm Delete</h3>
                        <p>Are you sure you want to delete <strong>{confirmDelete.label}</strong>?</p>
                        <p className="rd-modal-warn">This action cannot be undone.</p>
                        <div className="rd-modal-actions">
                            <button className="rd-modal-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="rd-modal-delete" onClick={executeConfirm}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="detail-topbar">
                <button className="back-btn" onClick={() => navigate('/rooms')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
                    Back to Rooms
                </button>
            </div>

            {/* Room header */}
            <div className="rd-header">
                <div className="rd-header-icon">{isTrip ? '✈️' : '🏠'}</div>
                <div className="rd-header-info">
                    <h1 className="rd-title">{room.name || 'Unnamed Room'}</h1>
                    <div className="rd-meta">
                        <span className={`type-badge ${isTrip ? 'type-trip' : 'type-room'}`}>{isTrip ? 'Trip' : 'Room'}</span>
                        {room.joinCode && <span className="join-code">{room.joinCode}</span>}
                        <span className="rd-date">Created {room.createdAt ? formatDistanceToNow(room.createdAt, { addSuffix: true }) : '—'}</span>
                    </div>
                </div>
                <div className="rd-header-stats">
                    <div className="rd-hs"><span className="rd-hs-num">{members.length}</span><span className="rd-hs-lbl">Members</span></div>
                    <div className="rd-hs"><span className="rd-hs-num">₹{totalExpenseAmount.toLocaleString()}</span><span className="rd-hs-lbl">Spent</span></div>
                    <div className="rd-hs"><span className="rd-hs-num">{tasks.length}</span><span className="rd-hs-lbl">Tasks</span></div>
                    <div className="rd-hs"><span className="rd-hs-num">{chats.length}</span><span className="rd-hs-lbl">Chats</span></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="rd-tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`rd-tab ${activeTab === t.key ? 'rd-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
                        {t.label}
                        {t.count !== null && <span className="rd-tab-count">{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="rd-content">
                {activeTab === 'members' && (
                    <div className="rd-members-list">
                        {members.map(m => (
                            <div key={m.id} className="rd-member">
                                <div className="rd-member-click" onClick={() => navigate(`/users/${m.id}`)}>
                                    <div className="rd-member-avatar" style={{ background: `hsl(${(m.displayName?.charCodeAt(0) || 0) * 7}, 60%, 50%)` }}>
                                        {m.photoUrl ? <img src={m.photoUrl} alt="" /> : (m.displayName?.[0]?.toUpperCase() || '?')}
                                    </div>
                                    <div className="rd-member-info">
                                        <span className="rd-member-name">{m.displayName || 'Unknown'}</span>
                                        <span className="rd-member-email">{m.email || m.phoneNumber || '—'}</span>
                                    </div>
                                </div>
                                {m.id === room.createdBy && <span className="rd-owner-badge">Owner</span>}
                                {m.id !== room.createdBy && (
                                    <button className="rd-del-btn" title="Remove member" onClick={() => setConfirmDelete({ type: 'member', id: m.id, label: m.displayName || 'this member' })}>
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="rd-table-wrap">
                        {expenses.length === 0 ? (
                            <p className="rd-empty">No expenses recorded</p>
                        ) : (
                            <table className="rd-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Paid By</th>
                                        <th>Split Among</th>
                                        <th>Date</th>
                                        <th className="th-action">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(e => (
                                        <tr key={e.id}>
                                            <td className="rd-exp-desc">
                                                {e.description || '—'}
                                                {e.notes && <span className="rd-exp-note">{e.notes}</span>}
                                            </td>
                                            <td><span className="rd-cat-badge">{CATEGORY_ICONS[e.category] || '🏷️'} {e.category}</span></td>
                                            <td className="rd-exp-amt">₹{Number(e.amount || 0).toLocaleString()}</td>
                                            <td className="rd-exp-payer">{getName(e.paidBy)}</td>
                                            <td className="rd-exp-split">{e.splitAmong?.length || 0} people</td>
                                            <td className="rd-exp-date">{e.createdAt ? format(e.createdAt, 'MMM d, yyyy') : '—'}</td>
                                            <td className="td-action">
                                                <button className="rd-edit-btn" title="Edit expense" onClick={() => openEditExpense(e)}>
                                                    <EditIcon />
                                                </button>
                                                <button className="rd-del-btn" title="Delete expense" onClick={() => setConfirmDelete({ type: 'expense', id: e.id, label: e.description || 'this expense' })}>
                                                    <TrashIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" className="rd-tfoot-label">Total</td>
                                        <td className="rd-exp-amt rd-tfoot-total">₹{totalExpenseAmount.toLocaleString()}</td>
                                        <td colSpan="4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="rd-table-wrap">
                        {tasks.length === 0 ? (
                            <p className="rd-empty">No tasks created</p>
                        ) : (
                            <table className="rd-table">
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Frequency</th>
                                        <th>Rotation</th>
                                        <th>Assigned To</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="th-action">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map(t => (
                                        <tr key={t.id}>
                                            <td className="rd-task-title">
                                                {t.title}
                                                {t.description && <span className="rd-exp-note">{t.description}</span>}
                                            </td>
                                            <td className="rd-task-freq">{t.frequency || '—'}</td>
                                            <td className="rd-task-rot">{t.rotationType || '—'}</td>
                                            <td className="rd-task-assigned">{t.memberIds?.map(uid => getName(uid)).join(', ') || '—'}</td>
                                            <td><span className={`rd-task-status ${t.isActive !== false ? 'active' : 'inactive'}`}>{t.isActive !== false ? 'Active' : 'Paused'}</span></td>
                                            <td className="rd-exp-date">{t.createdAt ? format(t.createdAt, 'MMM d, yyyy') : '—'}</td>
                                            <td className="td-action">
                                                <button className="rd-edit-btn" title="Edit task" onClick={() => openEditTask(t)}>
                                                    <EditIcon />
                                                </button>
                                                <button className="rd-del-btn" title="Delete task" onClick={() => setConfirmDelete({ type: 'task', id: t.id, label: t.title || 'this task' })}>
                                                    <TrashIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="rd-chat-list">
                        {chats.length === 0 ? (
                            <p className="rd-empty">No messages</p>
                        ) : (
                            chats.slice(0, 100).map(c => (
                                <div key={c.id} className="rd-chat-msg">
                                    <div className="rd-chat-avatar" style={{ background: `hsl(${(c.senderName?.charCodeAt(0) || 0) * 7}, 60%, 50%)` }}>
                                        {c.senderName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="rd-chat-body">
                                        <div className="rd-chat-header">
                                            <span className="rd-chat-sender">{c.senderName || getName(c.senderId)}</span>
                                            <span className="rd-chat-time">{c.timestamp ? formatDistanceToNow(c.timestamp, { addSuffix: true }) : '—'}</span>
                                        </div>
                                        <p className="rd-chat-text">
                                            {c.type === 'image' ? '📷 Image' : c.type === 'file' ? '📎 File' : c.text || c.message || '—'}
                                        </p>
                                    </div>
                                    <button className="rd-del-btn rd-del-msg" title="Delete message" onClick={() => setConfirmDelete({ type: 'message', id: c.id, label: (c.text || c.message || 'this message').slice(0, 30) })}>
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'guests' && (
                    <div className="rd-members-list">
                        {guests.length === 0 ? (
                            <p className="rd-empty">No guests</p>
                        ) : guests.map(([guestId, g]) => (
                            <div key={guestId} className="rd-member">
                                <div className="rd-member-avatar" style={{ background: '#64748b' }}>
                                    {g.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="rd-member-info">
                                    <span className="rd-member-name">{g.name || 'Unknown'}</span>
                                    <span className="rd-member-email">{g.email || g.phoneNumber || 'Guest'}</span>
                                </div>
                                <button className="rd-del-btn" title="Remove guest" onClick={() => setConfirmDelete({ type: 'guest', id: guestId, label: g.name || 'this guest' })}>
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="rd-info-list">
                        <div className="rd-info-row"><span className="rd-info-key">Room ID</span><span className="rd-info-val mono">{room.id}</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Created By</span><span className="rd-info-val">{getName(room.createdBy)}</span></div>
                        {room.joinCode && <div className="rd-info-row"><span className="rd-info-key">Join Code</span><span className="rd-info-val mono">{room.joinCode}</span></div>}
                        <div className="rd-info-row"><span className="rd-info-key">Created</span><span className="rd-info-val">{room.createdAt ? format(room.createdAt, 'PPpp') : '—'}</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Type</span><span className="rd-info-val">{isTrip ? 'Trip' : 'Regular Room'}</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Members</span><span className="rd-info-val">{members.length}</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Guests</span><span className="rd-info-val">{guests.length}</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Total Expenses</span><span className="rd-info-val">₹{totalExpenseAmount.toLocaleString()} ({expenses.length} entries)</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Tasks</span><span className="rd-info-val">{tasks.length}</span></div>
                        <div className="rd-info-row"><span className="rd-info-key">Messages</span><span className="rd-info-val">{chats.length}</span></div>
                        {room.settings?.tripDescription && <div className="rd-info-row"><span className="rd-info-key">Description</span><span className="rd-info-val">{room.settings.tripDescription}</span></div>}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="rd-modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="rd-modal rd-modal-edit" onClick={e => e.stopPropagation()}>
                        <h3>Edit {editModal.type === 'expense' ? 'Expense' : 'Task'}</h3>
                        <div className="rd-edit-fields">
                            {editModal.type === 'expense' && (
                                <>
                                    <label>Description</label>
                                    <input type="text" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                                    <label>Amount (₹)</label>
                                    <input type="number" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                                    <label>Category</label>
                                    <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                                        {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <label>Notes</label>
                                    <input type="text" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                                </>
                            )}
                            {editModal.type === 'task' && (
                                <>
                                    <label>Title</label>
                                    <input type="text" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                                    <label>Description</label>
                                    <input type="text" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                                    <label>Frequency</label>
                                    <select value={editForm.frequency} onChange={e => setEditForm(p => ({ ...p, frequency: e.target.value }))}>
                                        <option value="Daily">Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Custom">Custom</option>
                                    </select>
                                    <label className="rd-checkbox-label">
                                        <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(p => ({ ...p, isActive: e.target.checked }))} />
                                        Active
                                    </label>
                                </>
                            )}
                        </div>
                        <div className="rd-modal-actions">
                            <button className="rd-modal-cancel" onClick={() => setEditModal(null)}>Cancel</button>
                            <button className="rd-modal-save" onClick={handleSaveEdit}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
