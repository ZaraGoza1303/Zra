import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserPlus, User, Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../services/api';
import { isValidEmail } from '../utils/validationUtils';

// Reusable input field with icon
const IconInput = ({
    icon, type, placeholder, value, onChange, showToggle, onToggle, show, fieldError
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

export default function Register() {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState(false);
    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
    const [isOtpStep, setIsOtpStep] = React.useState(false);
    const [otp, setOtp] = React.useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setValidationErrors({});

        if (!username || !email || !password || !confirmPassword) { setError('Please fill in all fields'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (!isValidEmail(email)) { setError('Please enter a valid email address'); return; }
        setLoading(true);

        try {
            await apiCall('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, confirm_password: confirmPassword }),
            });
            setIsOtpStep(true);
            setSuccess(true);
            setError('');
        } catch (err: any) {
            if (err.data) {
                setValidationErrors(err.data);
                if (typeof err.data === 'object') {
                    setError(`Validation failed: ${Object.values(err.data).join(', ')}`);
                } else {
                    setError(err.message || 'Registration failed');
                }
            } else {
                setError(err.message || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 6) { setError('Please enter a valid 6-digit OTP'); return; }
        setLoading(true);
        setError('');
        try {
            await apiCall('/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            setSuccess(true);
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const getFieldError = (field: string) => {
        if (validationErrors && typeof validationErrors === 'object') {
            return validationErrors[field] || validationErrors[field + '_error'] || (validationErrors as any)[field + 'Error'] || '';
        }
        return '';
    };



    return (
        <div className="flex-center w-full h-full animate-fade-in">
            {!isOtpStep ? (
                /* STEP 1: REGISTER FORM */
                <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <div className="flex-center" style={{ marginBottom: '0.75rem', color: 'var(--success)' }}>
                            <UserPlus size={40} />
                        </div>
                        <h2>Create Account</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Join the chat today</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                            padding: '10px', borderRadius: '8px',
                            marginBottom: '12px', fontSize: '0.875rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div className="input-group">
                            <label className="input-label">Username</label>
                            <IconInput
                                icon={<User size={18} />}
                                type="text"
                                placeholder="Enter Username"
                                value={username}
                                onChange={setUsername}
                                fieldError={getFieldError('username')}
                            />
                            {getFieldError('username') && (
                                <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                                    {getFieldError('username')}
                                </small>
                            )}
                        </div>

                        {/* Email */}
                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <IconInput
                                icon={<Mail size={18} />}
                                type="email"
                                placeholder="Enter Email Address"
                                value={email}
                                onChange={setEmail}
                                fieldError={getFieldError('email')}
                            />
                            {getFieldError('email') && (
                                <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                                    {getFieldError('email')}
                                </small>
                            )}
                        </div>

                        {/* Password */}
                        <div className="input-group">
                            <label className="input-label">Password</label>
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
                                fieldError={getFieldError('confirm_password') || getFieldError('confirmPassword')}
                            />
                            {(getFieldError('confirm_password') || getFieldError('confirmPassword')) && (
                                <small style={{ color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                                    {getFieldError('confirm_password') || getFieldError('confirmPassword')}
                                </small>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                            style={{ marginTop: '12px' }}
                        >
                            {loading ? 'Registering...' : 'Sign Up'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login</Link>
                    </div>
                </div>
            ) : (
                /* STEP 2: OTP VERIFICATION */
                <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <div className="flex-center" style={{ marginBottom: '0.75rem', color: 'var(--primary)' }}>
                            <Mail size={40} />
                        </div>
                        <h2>Verify Email</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                            We've sent a 6-digit code to <br />
                            <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                            padding: '10px', borderRadius: '8px',
                            marginBottom: '12px', fontSize: '0.875rem',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && !error && (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
                            padding: '10px', borderRadius: '8px',
                            marginBottom: '12px', fontSize: '0.875rem',
                        }}>
                            Registration successful! Please verify your email.
                        </div>
                    )}

                    <form onSubmit={handleVerifyOtp}>
                        <div className="input-group">
                            <label className="input-label" style={{ textAlign: 'center' }}>Enter OTP Code</label>
                            <input
                                type="text"
                                className="input-field"
                                style={{
                                    textAlign: 'center', letterSpacing: '0.5em',
                                    fontSize: '1.25rem', paddingLeft: '0.5em',
                                }}
                                placeholder="000000"
                                maxLength={6}
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading || otp.length < 6}
                            style={{ marginTop: '12px' }}
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <button
                            type="button"
                            onClick={() => setIsOtpStep(false)}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--primary)', cursor: 'pointer',
                                fontWeight: 600, padding: 0,
                            }}
                        >
                            ← Back to Register Form
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}