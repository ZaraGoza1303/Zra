import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserPlus, User, Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../services/api';
import { isValidEmail } from '../utils/validationUtils';

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
        <div className="min-h-screen font-sans bg-[#0c0c0e] text-[#f1f5f9] flex flex-col items-center justify-center w-full relative">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-20">
                <Link to="/" className="flex items-center gap-2.5 group">
                    <img src="/zra.svg" alt="Zra" className="w-7 h-7" />
                    <span className="font-bold text-[19px] text-white tracking-tight">Zra</span>
                </Link>
            </div>

            {/* Form Container */}
            <div className="flex flex-col justify-center w-full max-w-[520px] mx-auto px-6 py-12 relative z-10 my-auto">
                {!isOtpStep ? (
                    <>
                        <div className="mb-6 mt-12 md:mt-0">
                            <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-[#7fa6ff] mb-3">
                                Registration
                            </p>
                            <h1 className="text-[34px] md:text-[38px] font-extrabold tracking-tight text-white mb-2.5 leading-[1.1]">
                                Create Account
                            </h1>
                            <p className="text-[#a1a1aa] text-[14px] font-medium tracking-tight">
                                Join the community today.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-[13px] text-center font-medium animate-fade-in shadow-lg">
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {/* Username Field */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8] ml-0.5" htmlFor="username">
                                    Username
                                </label>
                                <div className="relative group mt-2">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-[#e4e4e7] transition-colors">
                                        <User size={16} className="stroke-[2.5]" />
                                    </div>
                                    <input
                                        id="username"
                                        type="text"
                                        className={`w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[13.5px] rounded-xl block py-[14px] pl-[38px] pr-3.5 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none placeholder:font-medium shadow-sm ${getFieldError('username') ? 'border-red-500/50' : ''}`}
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                                {getFieldError('username') && (
                                    <small className="text-red-400 mt-1.5 block text-xs font-medium ml-1">
                                        {getFieldError('username')}
                                    </small>
                                )}
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8] ml-0.5" htmlFor="email">
                                    Email Address
                                </label>
                                <div className="relative group mt-2">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-[#e4e4e7] transition-colors">
                                        <Mail size={16} className="stroke-[2.5]" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        className={`w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[13.5px] rounded-xl block py-[14px] pl-[38px] pr-3.5 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none placeholder:font-medium shadow-sm ${getFieldError('email') ? 'border-red-500/50' : ''}`}
                                        placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                {getFieldError('email') && (
                                    <small className="text-red-400 mt-1.5 block text-xs font-medium ml-1">
                                        {getFieldError('email')}
                                    </small>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Password Field */}
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8] ml-0.5" htmlFor="password">
                                        Password
                                    </label>
                                    <div className="relative group mt-2">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-[#e4e4e7] transition-colors">
                                            <Lock size={16} className="stroke-[2.5]" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            className={`w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[13.5px] rounded-xl block py-[14px] pl-[38px] pr-10 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none placeholder:font-medium tracking-tight shadow-sm ${getFieldError('password') ? 'border-red-500/50' : ''}`}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                            title={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={16} className="stroke-[2.5]" /> : <Eye size={16} className="stroke-[2.5]" />}
                                        </button>
                                    </div>
                                    {getFieldError('password') && (
                                        <small className="text-red-400 mt-1.5 block text-xs font-medium ml-1">
                                            {getFieldError('password')}
                                        </small>
                                    )}
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8] ml-0.5" htmlFor="confirm_password">
                                        Confirm Pasword
                                    </label>
                                    <div className="relative group mt-2">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-[#e4e4e7] transition-colors">
                                            <Lock size={16} className="stroke-[2.5]" />
                                        </div>
                                        <input
                                            id="confirm_password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            className={`w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[13.5px] rounded-xl block py-[14px] pl-[38px] pr-10 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none placeholder:font-medium tracking-tight shadow-sm ${(getFieldError('confirm_password') || getFieldError('confirmPassword')) ? 'border-red-500/50' : ''}`}
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            title={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} className="stroke-[2.5]" /> : <Eye size={16} className="stroke-[2.5]" />}
                                        </button>
                                    </div>
                                    {(getFieldError('confirm_password') || getFieldError('confirmPassword')) && (
                                        <small className="text-red-400 mt-1.5 block text-xs font-medium ml-1">
                                            {getFieldError('confirm_password') || getFieldError('confirmPassword')}
                                        </small>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#82a3fb] hover:bg-[#92b0fc] active:scale-[0.98] text-[#0c0c0e] font-bold py-[14px] rounded-xl text-[14px] transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(130,163,251,0.15)]"
                            >
                                {loading ? "Registering..." : "Sign Up"}
                            </button>
                        </form>
                    </>
                ) : (
                    /* OTP Form */
                    <>
                        <div className="mb-8 text-center flex flex-col items-center mt-12 md:mt-0">
                            <div className="w-14 h-14 rounded-full bg-[#7fa6ff]/10 flex items-center justify-center mb-5 text-[#82a3fb]">
                                <Mail size={24} className="stroke-[2]" />
                            </div>
                            <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-white mb-2.5 leading-[1.1]">
                                Verify Email
                            </h1>
                            <p className="text-[#a1a1aa] text-[14px] font-medium tracking-tight">
                                We've sent a 6-digit code to <br />
                                <strong className="text-[#e4e4e7]">{email}</strong>
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-[13px] text-center font-medium animate-fade-in shadow-lg">
                                {error}
                            </div>
                        )}

                        {success && !error && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-[13px] text-center font-medium animate-fade-in shadow-lg">
                                Registration successful! Please verify your email.
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleVerifyOtp}>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#d4d4d8] ml-0.5 text-center block" htmlFor="otp">
                                    Enter OTP Code
                                </label>
                                <div className="relative group mt-2">
                                    <input
                                        id="otp"
                                        type="text"
                                        maxLength={6}
                                        className="w-full bg-[#131316] border border-transparent text-[#f1f5f9] text-[20px] rounded-xl block py-[14px] px-4 placeholder:text-[#52525b] focus:border-white/10 focus:bg-[#18181b] focus:ring-0 transition-all duration-300 outline-none text-center tracking-[0.5em] shadow-sm font-mono"
                                        placeholder="OTP Code"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full bg-[#82a3fb] hover:bg-[#92b0fc] active:scale-[0.98] text-[#0c0c0e] font-bold py-[14px] rounded-xl text-[14px] transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(130,163,251,0.15)]"
                            >
                                {loading ? "Verifying..." : "Verify OTP"}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <button
                                type="button"
                                onClick={() => setIsOtpStep(false)}
                                className="text-[13px] text-[#71717a] font-medium tracking-tight hover:text-white transition-colors"
                            >
                                &larr; Back to Register Form
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            {!isOtpStep && (
                <div className="absolute bottom-5 left-0 w-full text-center pb-8 z-20">
                    <p className="text-[13px] text-[#71717a] font-medium tracking-tight">
                        Already have an account?
                        <Link className="text-[#f1f5f9] font-bold hover:underline ml-1.5 transition-all" to="/login">
                            Log in
                        </Link>
                    </p>
                </div>
            )}
        </div>
    );
}