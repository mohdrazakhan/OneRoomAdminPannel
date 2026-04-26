import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from '../components/StatusBadge';
import './DashboardPage.css';

const KNOWN_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

const PRESET_TAGS = [
    { label: 'UI', color: '#818cf8' },
    { label: 'Expense', color: '#f59e0b' },
    { label: 'Chat', color: '#06b6d4' },
    { label: 'Tasks', color: '#10b981' },
    { label: 'Auth', color: '#ef4444' },
    { label: 'Notification', color: '#f97316' },
    { label: 'Payment', color: '#8b5cf6' },
    { label: 'Room', color: '#ec4899' },
    { label: 'Performance', color: '#14b8a6' },
    { label: 'Crash', color: '#dc2626' },
    { label: 'Media', color: '#6366f1' },
    { label: 'Other', color: '#64748b' },
];

function getTagColor(tag) {
    const preset = PRESET_TAGS.find(t => t.label.toLowerCase() === tag.toLowerCase());
    return preset?.color || '#64748b';
}

// Normalize any status value to our known set
function normalizeStatus(status) {
    if (!status) return 'open';
    const s = status.toLowerCase().trim();
    if (s === 'open' || s === 'new' || s === 'pending') return 'open';
    if (s === 'in-progress' || s === 'in progress' || s === 'inprogress' || s === 'working') return 'in-progress';
    if (s === 'resolved' || s === 'fixed' || s === 'done') return 'resolved';
    if (s === 'closed' || s === 'wontfix' || s === 'rejected' || s === 'duplicate') return 'closed';
    return s; // keep unknown values as-is
}

export default function DashboardPage({ onBugCountsChange }) {
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams] = useSearchParams();
    const [sortField, setSortField] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');
    const [toast, setToast] = useState(null);
    const [tagMenuBugId, setTagMenuBugId] = useState(null);
    const [tagFilter, setTagFilter] = useState(null);
    const tagMenuRef = useRef(null);
    const navigate = useNavigate();

    const statusFilter = searchParams.get('status') || 'all';

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Close tag menu when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (tagMenuBugId && tagMenuRef.current && !tagMenuRef.current.contains(e.target)) {
                setTagMenuBugId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [tagMenuBugId]);

    // Real-time listener
    useEffect(() => {
        const q = query(collection(db, 'bug_reports'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bugList = snapshot.docs.map(d => {
                const data = d.data();
                const rawStatus = data.status;
                const normalized = normalizeStatus(rawStatus);
                return {
                    id: d.id,
                    ...data,
                    rawStatus: rawStatus, // keep original for debugging
                    status: normalized,   // use normalized for display
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                };
            });
            setBugs(bugList);
            setLoading(false);

            // Compute counts using normalized statuses
            const counts = { open: 0, 'in-progress': 0, resolved: 0, closed: 0, total: bugList.length };
            bugList.forEach(b => {
                const s = b.status;
                if (counts[s] !== undefined) {
                    counts[s]++;
                } else {
                    // Unknown status — count as open
                    counts.open++;
                }
            });
            onBugCountsChange?.(counts);
        }, (err) => {
            console.error('Error fetching bugs:', err);
            showToast('Failed to load bugs: ' + err.message, 'error');
            setLoading(false);
        });

        return unsubscribe;
    }, [onBugCountsChange, showToast]);

    // Build filter options dynamically (include any status found in bugs)
    const allStatuses = [...new Set(bugs.map(b => b.status))];
    const filterStatuses = ['all', ...KNOWN_STATUSES];
    // Add any extra unknown statuses found in data
    allStatuses.forEach(s => {
        if (!filterStatuses.includes(s)) filterStatuses.push(s);
    });

    // Filter & search
    const filtered = bugs
        .filter(b => {
            if (statusFilter === 'all') return true;
            return b.status === statusFilter;
        })
        .filter(b => {
            if (tagFilter) {
                return b.tags?.includes(tagFilter);
            }
            return true;
        })
        .filter(b => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                b.title?.toLowerCase().includes(q) ||
                b.description?.toLowerCase().includes(q) ||
                b.contact?.toLowerCase().includes(q) ||
                b.tags?.some(t => t.toLowerCase().includes(q))
            );
        })
        .sort((a, b) => {
            const valA = sortField === 'createdAt' ? a.createdAt?.getTime?.() || 0 : (a[sortField] || '').toLowerCase?.() || '';
            const valB = sortField === 'createdAt' ? b.createdAt?.getTime?.() || 0 : (b[sortField] || '').toLowerCase?.() || '';
            if (sortDir === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

    // Collect all unique tags from all bugs
    const allTags = [...new Set(bugs.flatMap(b => b.tags || []))];

    const counts = {
        total: bugs.length,
        open: bugs.filter(b => b.status === 'open').length,
        'in-progress': bugs.filter(b => b.status === 'in-progress').length,
        resolved: bugs.filter(b => b.status === 'resolved').length,
        closed: bugs.filter(b => b.status === 'closed').length,
    };

    // Count bugs with unknown status (not in known list)
    const unknownCount = bugs.filter(b => !KNOWN_STATUSES.includes(b.status)).length;

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const handleStatusChange = async (bugId, newStatus) => {
        try {
            await updateDoc(doc(db, 'bug_reports', bugId), { status: newStatus });
            showToast(`Status changed to "${newStatus}"`, 'success');
        } catch (err) {
            console.error('Failed to update status:', err);
            showToast('Failed to update: ' + err.message, 'error');
        }
    };

    const handleAddTag = async (e, bugId, tag) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'bug_reports', bugId), {
                tags: arrayUnion(tag)
            });
            setTagMenuBugId(null);
            showToast(`Tag "${tag}" added`, 'success');
        } catch (err) {
            console.error('Failed to add tag:', err);
            showToast('Failed to add tag: ' + err.message, 'error');
        }
    };

    const handleRemoveTag = async (e, bugId, tag) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'bug_reports', bugId), {
                tags: arrayRemove(tag)
            });
            showToast(`Tag "${tag}" removed`, 'success');
        } catch (err) {
            console.error('Failed to remove tag:', err);
            showToast('Failed to remove tag: ' + err.message, 'error');
        }
    };

    const SortIcon = ({ field }) => (
        <span className={`sort-icon ${sortField === field ? 'sort-active' : ''}`}>
            {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loader-ring" />
                <p>Loading bug reports...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Toast notification */}
            {toast && (
                <div className={`toast toast-${toast.type} animate-fade-in`}>
                    {toast.type === 'error' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                    )}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Mobile header */}
            <div className="dashboard-mobile-header">
                <h2 className="text-gradient">Bug Reports</h2>
            </div>

            {/* Stats cards */}
            <div className="stats-grid stagger">
                <div className="stat-card animate-fade-in-up" style={{ '--accent': 'var(--primary)' }}>
                    <div className="stat-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.total}</span>
                        <span className="stat-label">Total Reports</span>
                    </div>
                </div>
                <div className="stat-card animate-fade-in-up" style={{ '--accent': 'var(--status-open)' }}>
                    <div className="stat-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.open}{unknownCount > 0 ? ` +${unknownCount}` : ''}</span>
                        <span className="stat-label">Open</span>
                    </div>
                </div>
                <div className="stat-card animate-fade-in-up" style={{ '--accent': 'var(--status-progress)' }}>
                    <div className="stat-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{counts['in-progress']}</span>
                        <span className="stat-label">In Progress</span>
                    </div>
                </div>
                <div className="stat-card animate-fade-in-up" style={{ '--accent': 'var(--status-resolved)' }}>
                    <div className="stat-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.resolved + counts.closed}</span>
                        <span className="stat-label">Resolved</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="dashboard-toolbar">
                <div className="toolbar-left">
                    <div className="search-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            id="bug-search"
                            type="text"
                            placeholder="Search bugs or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                        )}
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="filter-tabs">
                        {filterStatuses.map(s => (
                            <button
                                key={s}
                                className={`filter-tab ${statusFilter === s ? 'filter-active' : ''}`}
                                onClick={() => navigate(s === 'all' ? '/bugs' : `/bugs?status=${s}`)}
                            >
                                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tag filters */}
            {allTags.length > 0 && (
                <div className="tag-filter-bar">
                    <span className="tag-filter-label">Tags:</span>
                    <button
                        className={`tag-filter-chip ${!tagFilter ? 'tag-filter-active' : ''}`}
                        onClick={() => setTagFilter(null)}
                    >All</button>
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            className={`tag-filter-chip ${tagFilter === tag ? 'tag-filter-active' : ''}`}
                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                            style={{ '--tag-color': getTagColor(tag) }}
                        >
                            <span className="tag-dot" style={{ background: getTagColor(tag) }} />
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            {/* Bug table */}
            {filtered.length === 0 ? (
                <div className="empty-state animate-fade-in">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <h3>No bugs found</h3>
                    <p>{searchQuery ? 'Try a different search query' : 'No bug reports match this filter'}</p>
                </div>
            ) : (
                <div className="bug-table-wrap animate-fade-in">
                    <table className="bug-table">
                        <thead>
                            <tr>
                                <th className="th-title" onClick={() => handleSort('title')}>
                                    Title <SortIcon field="title" />
                                </th>
                                <th className="th-tags">Tags</th>
                                <th className="th-status">Status</th>
                                <th className="th-contact" onClick={() => handleSort('contact')}>
                                    Contact <SortIcon field="contact" />
                                </th>
                                <th className="th-date" onClick={() => handleSort('createdAt')}>
                                    Reported <SortIcon field="createdAt" />
                                </th>
                                <th className="th-attachments">Files</th>
                                <th className="th-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((bug) => (
                                <tr key={bug.id} className="bug-row" onClick={() => navigate(`/bugs/${bug.id}`)}>
                                    <td className="td-title">
                                        <div className="bug-title-cell">
                                            <span className="bug-title-text">{bug.title}</span>
                                            <span className="bug-desc-preview">{bug.description?.slice(0, 80)}{bug.description?.length > 80 ? '...' : ''}</span>
                                        </div>
                                    </td>
                                    <td className="td-tags" onClick={(e) => e.stopPropagation()}>
                                        <div className="tags-cell" ref={tagMenuBugId === bug.id ? tagMenuRef : null}>
                                            {bug.tags?.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="tag-chip"
                                                    style={{ '--tag-color': getTagColor(tag) }}
                                                    title={`Click to remove "${tag}"`}
                                                    onClick={(e) => handleRemoveTag(e, bug.id, tag)}
                                                >
                                                    {tag}
                                                    <span className="tag-remove">×</span>
                                                </span>
                                            ))}
                                            <div className="tag-add-wrap">
                                                <button
                                                    className="tag-add-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTagMenuBugId(tagMenuBugId === bug.id ? null : bug.id);
                                                    }}
                                                    title="Add tag"
                                                >+</button>
                                                {tagMenuBugId === bug.id && (
                                                    <div className="tag-menu" onClick={(e) => e.stopPropagation()}>
                                                        {PRESET_TAGS
                                                            .filter(t => !bug.tags?.includes(t.label))
                                                            .map(t => (
                                                                <button
                                                                    key={t.label}
                                                                    className="tag-menu-item"
                                                                    onClick={(e) => handleAddTag(e, bug.id, t.label)}
                                                                >
                                                                    <span className="tag-dot" style={{ background: t.color }} />
                                                                    {t.label}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="td-status" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            className={`status-select status-select-${bug.status}`}
                                            value={bug.status}
                                            onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                                        >
                                            <option value="open">Open</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </td>
                                    <td className="td-contact">
                                        <span className="contact-text">{bug.contact || '—'}</span>
                                    </td>
                                    <td className="td-date">
                                        <span className="date-text">
                                            {bug.createdAt ? formatDistanceToNow(bug.createdAt, { addSuffix: true }) : '—'}
                                        </span>
                                    </td>
                                    <td className="td-attachments">
                                        {bug.attachments?.length > 0 ? (
                                            <span className="attachment-count">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                                {bug.attachments.length}
                                            </span>
                                        ) : (
                                            <span className="no-attachments">—</span>
                                        )}
                                    </td>
                                    <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                                        <button className="action-btn" onClick={() => navigate(`/bugs/${bug.id}`)} title="View details">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="dashboard-footer-info">
                Showing {filtered.length} of {bugs.length} bug reports
            </div>
        </div>
    );
}
