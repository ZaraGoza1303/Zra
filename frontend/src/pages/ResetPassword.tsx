import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { apiCall } from '../services/api';

const IconInput = ({
    icon, type, placeholder, value, onChange, showToggle, onToggle, show, fieldError,
}: {
    icon: React.ReactNode;
    type: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    showToggle?: boolean;
    onToggle?: () => void;
    show?: boolean;
    fieldError?: string;
}) => (
    <div style={{ position: 'relative' }}>
        <div style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            left: '12px', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
        }}>
            {icon}
        </div>
        <input
            type={showToggle ? (show ? 'text' : 'password') : type}
            className="input-field"
            style={{
                paddingLeft: '40px',
                paddingRight: showToggle ? '40px' : undefined,
                borderColor: fieldError ? 'var(--danger)' : undefined,
            }}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
        />
        {showToggle && (
            <button
                type="button"
                onClick={onToggle}
                style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    right: '12px', color: 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center',
                }}
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        )}
    </div>
);

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState(false);
    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

    const getFieldError = (field: string) => {
        return validationErrors[field] || '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setValidationErrors({});

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!token) {
            setError('Invalid or missing reset token');
            return;
        }

        setLoading(true);
        try {
            await apiCall(`/auth/reset-password?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    new_password: password,
                    confirm_password: confirmPassword,
                }),
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            if (err.data && typeof err.data === 'object') {
                setValidationErrors(err.data);
                setError(`Validation failed: ${Object.values(err.data).join(', ')}`);
            } else {
                setError(err.message || 'Failed to reset password');
            }
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="flex-center w-full h-full animate-fade-in">
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="flex-center" style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                        <KeyRound size={48} />
                    </div>
                    <h2>Reset Password</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Enter your new password below</p>
                </div>

                {/* Token missing warning */}
                {!token && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                        padding: '12px', borderRadius: '8px',
                        marginBottom: '16px', fontSize: '0.875rem',
                    }}>
                        Invalid or expired reset link. Please request a new one.
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                        padding: '12px', borderRadius: '8px',
                        marginBottom: '16px', fontSize: '0.875rem',
                    }}>
                        {error}
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
                        padding: '12px', borderRadius: '8px',
                        marginBottom: '16px', fontSize: '0.875rem',
                    }}>
                        ✓ Password updated! Redirecting to login...
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        {/* New Password */}
                        <div className="input-group">
                            <label className="input-label">New Password</label>
                            <IconInput
                                icon={<Lock size={18} />}
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={setPassword}
                                showToggle
                                show={showPassword}
                                onToggle={() => setShowPassword(!showPassword)}
                                fieldError={getFieldError('password')}
                            />
                            {getFieldError('password') && (
                                <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                                    {getFieldError('password')}
                                </small>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <IconInput
                                icon={<Lock size={18} />}
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={setConfirmPassword}
                                showToggle
                                show={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                                fieldError={getFieldError('confirm_password')}
                            />
                            {getFieldError('confirm_password') && (
                                <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                                    {getFieldError('confirm_password')}
                                </small>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading || !token}
                            style={{ marginTop: '16px' }}
                        >
                            {loading ? 'Updating...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Remembered your password?{' '}
                    <a href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login</a>
                </div>
            </div>
        </div>
    );
}