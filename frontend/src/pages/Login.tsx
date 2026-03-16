// src/pages/Login.tsx
import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiCall } from '../services/api';
import { BACKEND_URL } from '../config';
import type { User } from '../types/chat';

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { loginState } = useAuthStore();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [rememberMe, setRememberMe] = React.useState(false);

    React.useEffect(() => {
        const oauth = searchParams.get('oauth');
        if (oauth === 'success') {
            const accessToken = searchParams.get('access_token');
            const refreshToken = searchParams.get('refresh_token');

            if (accessToken && refreshToken) {
                setLoading(true);
                try {
                    const payloadB64 = accessToken.split('.')[1];
                    const tokenPayload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
                    const userId = tokenPayload.ID || tokenPayload.id || 0;

                    const initialUser: User = {
                        id: userId,
                        refresh_token: refreshToken,
                        email: tokenPayload.email || '',
                        username: tokenPayload.username || '',
                        name: '',
                        bio: '',
                        profile_picture: undefined,
                    };
                    loginState(accessToken, initialUser);

                    apiCall<{ data: User }>(`/user/${userId}`, { method: 'GET' })
                        .then(res => {
                            if (res.data) {
                                loginState(accessToken, { ...res.data, refresh_token: refreshToken });
                            }
                        })
                        .catch(err => console.error('Failed sync profile:', err))
                        .finally(() => {
                            setLoading(false);
                            navigate(redirectTo);
                        });
                } catch (err) {
                    setLoading(false);
                    setError('Failed to process OAuth login.');
                }
            }
        }
    }, [searchParams, navigate, loginState, redirectTo]);

    const handleGoogleLogin = () => {
        // Tambahin prompt=consent agar Google menampilkan layar persetujuan aslinya
        window.location.href = `${BACKEND_URL}/auth/google?rememberMe=${rememberMe}&prompt=consent`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(email)) { setError('Please enter a valid email address'); return; }

        setLoading(true);
        setError('');

        try {
            const resp = await apiCall<any>('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (resp.data && resp.data.access_token) {
                try {
                    const payloadB64 = resp.data.access_token.split('.')[1];
                    const decodedStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
                    const tokenPayload = JSON.parse(decodedStr);
                    const userId = tokenPayload.ID || tokenPayload.id || 0;

                    loginState(resp.data.access_token, {
                        id: userId,
                        email: resp.data.email,
                        username: resp.data.username,
                        name: resp.data.name,
                        bio: resp.data.bio || '',
                        profile_picture: resp.data.profile_picture,
                        refresh_token: resp.data.refresh_token,
                    } as User);
                    navigate(redirectTo);
                } catch (e) {
                    setError('Failed to parse session token.');
                }
            } else {
                setError('Invalid response from server');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const isValidEmail = (email: string) => {
        // Harus ada @, domain minimal 2 karakter, TLD minimal 2 karakter (com, id, net, dll)
        const regex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(email)) return false;

        // Blacklist TLD yang tidak valid / typo umum
        const invalidTLDs = ['.co', '.c', '.om', '.cm'];
        const lower = email.toLowerCase();
        if (invalidTLDs.some(tld => lower.endsWith(tld))) return false;

        return true;
    };

    return (
        <div className="flex-center w-full h-full animate-fade-in">
            <div className="glass-panel w-full max-w-md mx-4" style={{ padding: '2rem 2.5rem' }}>

                {/* Header */}
                <div className="flex flex-col items-center text-center" style={{ marginBottom: '2rem' }}>
                    <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                        <LogIn size={48} />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Sign in to continue chatting
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '12px',
                        marginBottom: '16px',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{
                                position: 'absolute', top: '50%',
                                transform: 'translateY(-50%)', left: '12px',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type="email"
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{
                                position: 'absolute', top: '50%',
                                transform: 'translateY(-50%)', left: '12px',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', top: '50%',
                                    transform: 'translateY(-50%)', right: '12px',
                                    background: 'transparent', border: 'none',
                                    color: 'var(--text-muted)', cursor: 'pointer',
                                    padding: 0, display: 'flex', alignItems: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Form Options */}
                    <div className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                style={{ accentColor: 'var(--primary)' }}
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                            />
                            <span>Remember me</span>
                        </label>
                        <Link to="/forgot-password" style={{ color: 'var(--primary)' }}>
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>or</span>
                    <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                </div>

                {/* Google Login Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                {/* Footer */}
                <div className="text-center" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '24px' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Register
                    </Link>
                </div>
            </div>
        </div>
    );
}