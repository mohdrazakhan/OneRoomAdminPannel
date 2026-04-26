import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../config/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import StatusBadge from '../components/StatusBadge';
import './BugDetailPage.css';

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved', 'closed'];

export default function BugDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bug, setBug] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [replySuccess, setReplySuccess] = useState('');
    const [replyError, setReplyError] = useState('');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [imageModal, setImageModal] = useState(null);

    // Real-time bug listener
    useEffect(() => {
        const unsubBug = onSnapshot(doc(db, 'bug_reports', id), (snap) => {
            if (snap.exists()) {
                setBug({
                    id: snap.id,
                    ...snap.data(),
                    createdAt: snap.data().createdAt?.toDate?.() || new Date(),
                });
            }
            setLoading(false);
        });

        // Replies listener
        const repliesQuery = query(
            collection(db, 'bug_reports', id, 'replies'),
            orderBy('createdAt', 'asc')
        );
        const unsubReplies = onSnapshot(repliesQuery, (snap) => {
            setReplies(snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.() || new Date(),
            })));
        });

        return () => { unsubBug(); unsubReplies(); };
    }, [id]);

    const handleStatusChange = async (newStatus) => {
        try {
            await updateDoc(doc(db, 'bug_reports', id), { status: newStatus });
            setShowStatusMenu(false);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || sendingReply) return;

        setSendingReply(true);
        setReplyError('');
        setReplySuccess('');

        try {
            // 1. Store reply in Firestore
            await addDoc(collection(db, 'bug_reports', id, 'replies'), {
                message: replyText.trim(),
                adminEmail: auth.currentUser?.email || 'admin',
                adminName: auth.currentUser?.displayName || 'One Room Team',
                createdAt: serverTimestamp(),
            });

            // 2. Try to send email via Cloud Function
            try {
                const sendBugReply = httpsCallable(functions, 'sendBugReply');
                const result = await sendBugReply({
                    bugId: id,
                    bugTitle: bug.title,
                    recipientEmail: bug.contact,
                    message: replyText.trim(),
                });
                if (result.data?.emailSent) {
                    setReplySuccess('✅ Reply saved & email sent to reporter!');
                } else {
                    setReplySuccess('⚠️ Reply saved but email NOT sent — SMTP credentials not configured on server.');
                }
            } catch (emailErr) {
                console.warn('Cloud Function error:', emailErr);
                setReplySuccess('⚠️ Reply saved to database. Email failed: ' + (emailErr.message || 'Cloud Function error'));
            }

            setReplyText('');
        } catch (err) {
            console.error('Failed to send reply:', err);
            setReplyError('Failed to save reply. Please try again.');
        } finally {
            setSendingReply(false);
            // Clear success after 4s
            setTimeout(() => setReplySuccess(''), 4000);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loader-ring" />
                <p>Loading bug details...</p>
            </div>
        );
    }

    if (!bug) {
        return (
            <div className="detail-not-found">
                <h2>Bug report not found</h2>
                <p>This report may have been deleted.</p>
                <button className="back-btn" onClick={() => navigate('/bugs')}>← Back to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="bug-detail animate-fade-in">
            {/* Top bar */}
            <div className="detail-topbar">
                <button className="back-btn" onClick={() => navigate('/bugs')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12,19 5,12 12,5"/>
                    </svg>
                    Back
                </button>
                <div className="detail-topbar-actions">
                    <div className="status-dropdown" style={{ position: 'relative' }}>
                        <StatusBadge
                            status={bug.status || 'open'}
                            size="md"
                            interactive
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                        />
                        {showStatusMenu && (
                            <div className="status-menu">
                                {STATUS_OPTIONS.map(s => (
                                    <button
                                        key={s}
                                        className={`status-menu-item ${(bug.status || 'open') === s ? 'current' : ''}`}
                                        onClick={() => handleStatusChange(s)}
                                    >
                                        <StatusBadge status={s} size="sm" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content grid */}
            <div className="detail-grid">
                {/* Left — Bug info */}
                <div className="detail-main">
                    <div className="detail-card">
                        <h1 className="detail-title">{bug.title}</h1>

                        <div className="detail-meta">
                            <span className="meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                                {format(bug.createdAt, 'MMM d, yyyy · h:mm a')}
                            </span>
                            <span className="meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                {bug.userId?.slice(0, 12)}...
                            </span>
                        </div>

                        <div className="detail-section">
                            <h3 className="section-label">Description</h3>
                            <p className="section-content">{bug.description}</p>
                        </div>

                        {bug.steps && (
                            <div className="detail-section">
                                <h3 className="section-label">Steps to Reproduce</h3>
                                <p className="section-content pre-wrap">{bug.steps}</p>
                            </div>
                        )}

                        {/* Attachments */}
                        {bug.attachments?.length > 0 && (
                            <div className="detail-section">
                                <h3 className="section-label">
                                    Attachments
                                    <span className="attachment-badge">{bug.attachments.length}</span>
                                </h3>
                                <div className="attachments-grid">
                                    {bug.attachments.map((att, i) => (
                                        <div key={i} className="attachment-item" onClick={() => att.type?.startsWith('video') ? window.open(att.url, '_blank') : setImageModal(att.url)}>
                                            {att.type?.startsWith('video') ? (
                                                <div className="attachment-video">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
                                                    <span>{att.name || 'Video'}</span>
                                                </div>
                                            ) : (
                                                <img src={att.url} alt={att.name || `Attachment ${i + 1}`} className="attachment-img" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Replies section */}
                    <div className="detail-card replies-section">
                        <h3 className="section-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            Replies
                            {replies.length > 0 && <span className="attachment-badge">{replies.length}</span>}
                        </h3>

                        {replies.length === 0 ? (
                            <p className="no-replies">No replies yet. Send a reply to the reporter below.</p>
                        ) : (
                            <div className="replies-list">
                                {replies.map(reply => (
                                    <div key={reply.id} className="reply-item">
                                        <div className="reply-header">
                                            <div className="reply-avatar">
                                                {reply.adminName?.[0]?.toUpperCase() || 'A'}
                                            </div>
                                            <div className="reply-meta">
                                                <span className="reply-author">{reply.adminName || 'Admin'}</span>
                                                <span className="reply-time">
                                                    {reply.createdAt ? formatDistanceToNow(reply.createdAt, { addSuffix: true }) : '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="reply-message">{reply.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Reply form */}
                        <form className="reply-form" onSubmit={handleSendReply}>
                            <textarea
                                id="reply-textarea"
                                className="reply-textarea"
                                placeholder={`Reply to ${bug.contact || 'reporter'}... This will be sent to their email.`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                            />
                            {replyError && <div className="reply-error">{replyError}</div>}
                            {replySuccess && <div className="reply-success">{replySuccess}</div>}
                            <div className="reply-form-actions">
                                <span className="reply-hint">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
                                    Will email {bug.contact || 'reporter'}
                                </span>
                                <button type="submit" className="reply-send-btn" disabled={!replyText.trim() || sendingReply}>
                                    {sendingReply ? (
                                        <span className="login-spinner" style={{ width: 16, height: 16 }} />
                                    ) : (
                                        <>
                                            Send Reply
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right sidebar — metadata */}
                <div className="detail-sidebar">
                    <div className="detail-card">
                        <h3 className="section-label">Reporter Info</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <span className="info-key">Contact</span>
                                <span className="info-value">{bug.contact || '—'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-key">User ID</span>
                                <span className="info-value mono">{bug.userId || '—'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-key">App Version</span>
                                <span className="info-value">{bug.appVersion || 'Not specified'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-key">Reported</span>
                                <span className="info-value">{format(bug.createdAt, 'PPpp')}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-key">Status</span>
                                <StatusBadge status={bug.status || 'open'} />
                            </div>
                        </div>
                    </div>

                    <div className="detail-card">
                        <h3 className="section-label">Quick Actions</h3>
                        <div className="quick-actions">
                            {STATUS_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    className={`quick-action-btn ${(bug.status || 'open') === s ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(s)}
                                    disabled={(bug.status || 'open') === s}
                                >
                                    Mark as {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image modal */}
            {imageModal && (
                <div className="image-modal" onClick={() => setImageModal(null)}>
                    <button className="modal-close" onClick={() => setImageModal(null)}>✕</button>
                    <img src={imageModal} alt="Attachment preview" />
                </div>
            )}
        </div>
    );
}
