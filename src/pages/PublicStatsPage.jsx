import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import './PublicStatsPage.css';

export default function PublicStatsPage() {
    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Use the public appStats/global document (readable by anyone per existing rules)
        // instead of querying bug_reports directly (which requires auth)
        const unsubscribe = onSnapshot(doc(db, 'appStats', 'bugStats'), (snap) => {
            if (snap.exists()) {
                setCounts(snap.data());
            } else {
                setCounts({ total: 0, open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
            }
            setLoading(false);
        }, (err) => {
            console.error('Error loading bug stats:', err);
            // Fallback: show zeros if stats doc doesn't exist yet
            setCounts({ total: 0, open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const total = (counts?.total || 0);
    const resolved = (counts?.resolved || 0) + (counts?.closed || 0);
    const resolveRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return (
        <div className="public-page">
            <div className="public-bg-grid" />
            <div className="public-bg-glow public-glow-1" />
            <div className="public-bg-glow public-glow-2" />

            <div className="public-container animate-fade-in-up">
                {/* Header */}
                <div className="public-header">
                    <div className="public-logo">
                        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="url(#plg)" />
                            <path d="M10 16.5C10 13.5 12.5 11 16 11C19.5 11 22 13.5 22 16.5C22 19.5 19.5 22 16 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="16" cy="16.5" r="2" fill="white"/>
                            <defs><linearGradient id="plg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#8e7cf0"/><stop offset="1" stopColor="#674eeb"/></linearGradient></defs>
                        </svg>
                    </div>
                    <h1 className="public-title">One Room <span className="text-gradient">Bug Tracker</span></h1>
                    <p className="public-desc">
                        Real-time overview of reported issues. Our team actively works to resolve bugs and improve your experience.
                    </p>
                </div>

                {loading ? (
                    <div className="public-loading">
                        <div className="loader-ring" />
                        <p>Loading stats...</p>
                    </div>
                ) : (
                    <>
                        {/* Stats cards */}
                        <div className="public-stats stagger">
                            <div className="pub-stat-card animate-fade-in-up" style={{ '--card-accent': 'var(--primary)' }}>
                                <div className="pub-stat-ring">
                                    <span className="pub-stat-num">{counts?.total || 0}</span>
                                </div>
                                <span className="pub-stat-label">Total Reports</span>
                            </div>
                            <div className="pub-stat-card animate-fade-in-up" style={{ '--card-accent': '#f87171' }}>
                                <div className="pub-stat-ring">
                                    <span className="pub-stat-num">{counts?.open || 0}</span>
                                </div>
                                <span className="pub-stat-label">Open</span>
                            </div>
                            <div className="pub-stat-card animate-fade-in-up" style={{ '--card-accent': '#fbbf24' }}>
                                <div className="pub-stat-ring">
                                    <span className="pub-stat-num">{counts?.['in-progress'] || 0}</span>
                                </div>
                                <span className="pub-stat-label">In Progress</span>
                            </div>
                            <div className="pub-stat-card animate-fade-in-up" style={{ '--card-accent': '#34d399' }}>
                                <div className="pub-stat-ring">
                                    <span className="pub-stat-num">{resolved}</span>
                                </div>
                                <span className="pub-stat-label">Resolved</span>
                            </div>
                        </div>

                        {/* Resolve rate */}
                        <div className="public-resolve-card animate-fade-in-up">
                            <div className="resolve-header">
                                <h3>Resolution Rate</h3>
                                <span className="resolve-percent">{resolveRate}%</span>
                            </div>
                            <div className="resolve-bar-bg">
                                <div
                                    className="resolve-bar-fill"
                                    style={{ width: `${resolveRate}%` }}
                                />
                            </div>
                            <p className="resolve-text">
                                {resolved} of {total} bugs resolved
                            </p>
                        </div>

                        {/* Info */}
                        <div className="public-info-card animate-fade-in-up">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            <p>
                                Found a bug? Report it directly from the <strong>One Room app</strong> →
                                Profile → Report a Bug. Our team reviews every submission.
                            </p>
                        </div>
                    </>
                )}

                {/* Admin login link */}
                <div className="public-footer">
                    <button className="admin-login-link" onClick={() => navigate('/login')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        Admin Login
                    </button>
                </div>
            </div>
        </div>
    );
}
