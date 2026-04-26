import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);

            // SECURITY: Only admin@oneroom.living can access this panel
            if (cred.user.email !== 'admin@oneroom.living') {
                await signOut(auth);
                setError('Access denied. Only admin@oneroom.living can access this panel.');
                setLoading(false);
                return;
            }

            navigate('/');
        } catch (err) {
            const messages = {
                'auth/user-not-found': 'No admin account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/invalid-email': 'Invalid email address',
                'auth/too-many-requests': 'Too many attempts. Try again later',
                'auth/invalid-credential': 'Invalid email or password',
            };
            setError(messages[err.code] || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Background effects */}
            <div className="login-bg-grid" />
            <div className="login-bg-glow login-glow-1" />
            <div className="login-bg-glow login-glow-2" />

            <div className="login-card animate-fade-in-up">
                {/* Logo */}
                <div className="login-logo-wrap">
                    <div className="login-logo">
                        <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="url(#lg)" />
                            <path d="M10 16.5C10 13.5 12.5 11 16 11C19.5 11 22 13.5 22 16.5C22 19.5 19.5 22 16 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="16" cy="16.5" r="2" fill="white"/>
                            <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#8e7cf0"/><stop offset="1" stopColor="#674eeb"/></linearGradient></defs>
                        </svg>
                    </div>
                </div>

                <h1 className="login-title">Bug Tracker</h1>
                <p className="login-desc">One Room Admin Dashboard</p>

                {error && (
                    <div className="login-error animate-fade-in">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-field">
                        <label htmlFor="login-email">Email</label>
                        <div className="login-input-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                <path d="M22 7l-10 6L2 7"/>
                            </svg>
                            <input
                                id="login-email"
                                type="email"
                                placeholder="admin@oneroom.app"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-password">Password</label>
                        <div className="login-input-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="login-toggle-pw"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? (
                            <span className="login-spinner" />
                        ) : (
                            <>
                                Sign In
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                    <polyline points="12,5 19,12 12,19"/>
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <p className="login-footer-text">
                    Protected admin area · Only authorized users
                </p>
            </div>
        </div>
    );
}
