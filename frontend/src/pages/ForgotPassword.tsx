import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { apiCall } from '../services/api';

export default function ForgotPassword() {
    const [email, setEmail] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState(false);
    const [serverMessage, setServerMessage] = React.useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please fill in your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Ambil response dari API
            const response = await apiCall('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            }) as { data: string };

            // Simpan pesan sukses dari backend (msg di Go)
            setServerMessage(response.data || 'Check your email for reset instructions!');
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-center w-full h-full animate-fade-in">
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="flex-center" style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                        <KeyRound size={48} />
                    </div>
                    <h2>Forgot Password</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                {success ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            fontSize: '0.875rem'
                        }}>
                            {serverMessage}
                        </div>
                        <Link to="/login" className="btn btn-secondary w-full">
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--text-muted)' }}>
                                    <Mail size={18} />
                                </div>
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

                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '8px' }}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                {!success && (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                        <Link to="/login" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowLeft size={16} /> Back to login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
