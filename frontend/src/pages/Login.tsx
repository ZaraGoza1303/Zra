// src/pages/Login.tsx
import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall } from '../services/api';
import type { User } from '../types/chat';

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';
    const { loginState } = useAuth();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

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
                            <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
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