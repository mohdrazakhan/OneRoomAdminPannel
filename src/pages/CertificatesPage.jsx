import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatDistanceToNow } from 'date-fns';
import './CertificatesPage.css';

const EMPTY_CERT = {
    id: '',
    name: '',
    email: '',
    DocumentType: 'OneRoom Internship OfferLetter',
    customDocType: '',
    EventName: '',
    Domain: '',
    issueDate: '',
    Duration: '',
    status: 'Ongoing',
};

const STATUS_OPTIONS = ['Ongoing', 'Completed', 'Revoked'];
const DOCTYPE_OPTIONS = [
    'OneRoom Internship OfferLetter',
    'OneRoom Internship Completion',
    'OneRoom Contribution Certificate',
    'OneRoom Appreciation Letter',
];

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ ...EMPTY_CERT });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [status, setStatus] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchCertificates = async () => {
        try {
            const snap = await getDocs(collection(db, 'certificates'));
            const list = snap.docs.map(d => ({
                docId: d.id,
                ...d.data(),
            }));
            list.sort((a, b) => (a.id || a.docId || '').localeCompare(b.id || b.docId || ''));
            setCertificates(list);
        } catch (err) {
            console.error('Failed to fetch certificates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCertificates(); }, []);

    const filtered = certificates.filter(c => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.id?.toLowerCase().includes(q) ||
            c.Domain?.toLowerCase().includes(q)
        );
    });

    const openAddModal = () => {
        setFormData({ ...EMPTY_CERT });
        setEditMode(false);
        setShowModal(true);
        setStatus(null);
    };

    const openEditModal = (cert) => {
        setFormData({
            ...cert,
            id: cert.id || cert.docId?.replace(/-/g, '/') || '',
        });
        setEditMode(true);
        setShowModal(true);
        setStatus(null);
    };

    const handleSave = async () => {
        if (!formData.id?.trim() || !formData.name?.trim()) {
            setStatus({ type: 'error', msg: 'Certificate ID and Name are required' });
            return;
        }

        setSaving(true);
        setStatus(null);

        try {
            // In edit mode, use existing docId; for new certs, derive from the entered ID
            const docId = editMode && formData.docId
                ? formData.docId
                : formData.id.trim().replace(/\//g, '-');
            const certData = {
                id: (formData.id || '').trim(),
                name: (formData.name || '').trim(),
                email: (formData.email || '').trim(),
                DocumentType: formData.DocumentType === '__custom__'
                    ? (formData.customDocType || '').trim()
                    : (formData.DocumentType || ''),
                EventName: (formData.EventName || '').trim(),
                Domain: (formData.Domain || '').trim(),
                issueDate: (formData.issueDate || '').trim(),
                Duration: (formData.Duration || '').trim(),
                status: formData.status || 'Ongoing',
            };

            await setDoc(doc(db, 'certificates', docId), certData, { merge: true });

            setStatus({ type: 'success', msg: editMode ? '✅ Certificate updated!' : '✅ Certificate added!' });
            await fetchCertificates();

            setTimeout(() => {
                setShowModal(false);
                setStatus(null);
            }, 1000);
        } catch (err) {
            console.error('Failed to save certificate:', err);
            setStatus({ type: 'error', msg: `Failed: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cert) => {
        try {
            await deleteDoc(doc(db, 'certificates', cert.docId));
            setDeleteConfirm(null);
            await fetchCertificates();
        } catch (err) {
            console.error('Failed to delete certificate:', err);
        }
    };

    const statusCounts = {
        all: certificates.length,
        Ongoing: certificates.filter(c => c.status === 'Ongoing').length,
        Completed: certificates.filter(c => c.status === 'Completed').length,
        Revoked: certificates.filter(c => c.status === 'Revoked').length,
    };

    if (loading) return <div className="dashboard-loading"><div className="loader-ring" /><p>Loading certificates...</p></div>;

    return (
        <div className="certs-page">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                            Certificates
                        </h1>
                        <p className="page-subtitle">{certificates.length} certificates issued</p>
                    </div>
                    <button className="cert-add-btn" onClick={openAddModal}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Certificate
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="certs-toolbar">
                <div className="search-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Search by name, email, ID, domain..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    {searchQuery && <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>}
                </div>
                <div className="filter-tabs">
                    {['all', 'Ongoing', 'Completed', 'Revoked'].map(s => (
                        <button key={s} className={`filter-tab ${statusFilter === s ? 'filter-active' : ''}`} onClick={() => setStatusFilter(s)}>
                            {s === 'all' ? 'All' : s}
                            <span className="filter-count">{statusCounts[s]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="empty-state animate-fade-in">
                    <h3>No certificates found</h3>
                    <p>{searchQuery ? 'Try a different search' : 'Click "Add Certificate" to create one'}</p>
                </div>
            ) : (
                <div className="certs-table-wrap animate-fade-in">
                    <table className="certs-table">
                        <thead>
                            <tr>
                                <th>Certificate ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Type</th>
                                <th>Domain</th>
                                <th>Status</th>
                                <th>Issue Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(cert => (
                                <tr key={cert.docId} className="cert-row">
                                    <td><span className="cert-id-badge">{cert.id || cert.docId?.replace(/-/g, '/') || '—'}</span></td>
                                    <td className="cert-name">{cert.name}</td>
                                    <td className="cert-email">{cert.email || '—'}</td>
                                    <td className="cert-type">{cert.DocumentType || '—'}</td>
                                    <td className="cert-domain">{cert.Domain || '—'}</td>
                                    <td>
                                        <span className={`cert-status cert-status-${(cert.status || 'ongoing').toLowerCase()}`}>
                                            {cert.status || 'Ongoing'}
                                        </span>
                                    </td>
                                    <td className="cert-date">{cert.issueDate || '—'}</td>
                                    <td className="cert-actions">
                                        <button className="cert-action-btn cert-edit" onClick={() => openEditModal(cert)} title="Edit">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                        <button className="cert-action-btn cert-delete" onClick={() => setDeleteConfirm(cert)} title="Delete">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="table-footer">Showing {filtered.length} of {certificates.length} certificates</div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="cert-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="cert-modal" onClick={e => e.stopPropagation()}>
                        <div className="cert-modal-header">
                            <h2>{editMode ? 'Edit Certificate' : 'Add Certificate'}</h2>
                            <button className="cert-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="cert-modal-body">
                            <div className="cert-form-row">
                                <div className="cert-form-field">
                                    <label>Certificate ID *</label>
                                    <input type="text" placeholder="e.g. OR/INT/2026/004" value={formData.id} onChange={e => setFormData(p => ({ ...p, id: e.target.value }))} disabled={editMode} />
                                </div>
                                <div className="cert-form-field">
                                    <label>Status</label>
                                    <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="cert-form-row">
                                <div className="cert-form-field">
                                    <label>Name *</label>
                                    <input type="text" placeholder="Full name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="cert-form-field">
                                    <label>Email</label>
                                    <input type="email" placeholder="Email address" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                                </div>
                            </div>
                            <div className="cert-form-row">
                                <div className="cert-form-field">
                                    <label>Document Type</label>
                                    <select value={DOCTYPE_OPTIONS.includes(formData.DocumentType) ? formData.DocumentType : '__custom__'} onChange={e => {
                                        if (e.target.value === '__custom__') {
                                            setFormData(p => ({ ...p, DocumentType: '__custom__', customDocType: '' }));
                                        } else {
                                            setFormData(p => ({ ...p, DocumentType: e.target.value, customDocType: '' }));
                                        }
                                    }}>
                                        {DOCTYPE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        <option value="__custom__">+ Custom Type...</option>
                                    </select>
                                    {(!DOCTYPE_OPTIONS.includes(formData.DocumentType)) && (
                                        <input
                                            type="text"
                                            placeholder="Enter custom document type"
                                            value={formData.customDocType || (formData.DocumentType !== '__custom__' ? formData.DocumentType : '')}
                                            onChange={e => setFormData(p => ({ ...p, customDocType: e.target.value, DocumentType: '__custom__' }))}
                                            style={{ marginTop: 8 }}
                                            autoFocus
                                        />
                                    )}
                                </div>
                                <div className="cert-form-field">
                                    <label>Domain</label>
                                    <input type="text" placeholder="e.g. Firebase Backend Intern" value={formData.Domain || ''} onChange={e => setFormData(p => ({ ...p, Domain: e.target.value }))} />
                                </div>
                            </div>
                            <div className="cert-form-row">
                                <div className="cert-form-field">
                                    <label>Event Name</label>
                                    <input type="text" placeholder="e.g. Bug Bounty Season 1" value={formData.EventName || ''} onChange={e => setFormData(p => ({ ...p, EventName: e.target.value }))} />
                                </div>
                                <div className="cert-form-field">
                                    <label>Issue Date</label>
                                    <input type="text" placeholder="e.g. April 13, 2026" value={formData.issueDate || ''} onChange={e => setFormData(p => ({ ...p, issueDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="cert-form-row">
                                <div className="cert-form-field">
                                    <label>Duration</label>
                                    <input type="text" placeholder="e.g. 2 Months" value={formData.Duration || ''} onChange={e => setFormData(p => ({ ...p, Duration: e.target.value }))} />
                                </div>
                                <div className="cert-form-field" />
                            </div>

                            {status && (
                                <div className={`notif-status notif-status-${status.type}`}>{status.msg}</div>
                            )}
                        </div>
                        <div className="cert-modal-footer">
                            <button className="cert-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="cert-save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editMode ? 'Update Certificate' : 'Add Certificate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="cert-modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="cert-modal cert-modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="cert-modal-header">
                            <h2>Delete Certificate</h2>
                        </div>
                        <div className="cert-modal-body">
                            <p className="cert-delete-msg">Are you sure you want to delete certificate <strong>{deleteConfirm.id}</strong> for <strong>{deleteConfirm.name}</strong>?</p>
                            <p className="cert-delete-warn">This action cannot be undone.</p>
                        </div>
                        <div className="cert-modal-footer">
                            <button className="cert-cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="cert-delete-confirm-btn" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
