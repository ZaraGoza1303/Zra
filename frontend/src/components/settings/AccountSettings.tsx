import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiCall } from '../../services/api';
import { useToastStore } from '../../store/toastStore';

export default function AccountSettings() {
    const { user } = useAuthStore();
    const { showToast } = useToastStore();
    const isGoogleAccount = user?.provider === 'google';

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast("New password and confirm password do not match", "error");
            return;
        }

        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setPasswordLoading(true);
        try {
            await apiCall("/user/change-password", {
                method: "PUT",
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                }),
            });

            showToast("Password changed successfully!", "success");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setIsPasswordModalOpen(false);
        } catch (err: any) {
            showToast(err.message || "Failed to change password", "error");
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans h-full">
            {/* Header */}
            <div className="px-10 py-8 border-b border-[var(--border-color)]">
                <h1 className="text-[var(--accent-color)] font-bold text-lg">Account Settings</h1>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Manage your account security and connections</p>
            </div>

            <div className="px-10 py-8 max-w-2xl">
                {/* Password & Security Section */}
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Password & Security</h2>
                    </div>

                    {/* Google Account */}
                    {isGoogleAccount ? (
                        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold">Google Account</h4>
                                    <p className="text-xs text-[var(--text-secondary)]">{user?.email || 'Connected via Google'}</p>
                                </div>
                            </div>

                            <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Your account is connected to Google. Password and security settings are managed by Google.
                                </p>
                                <ul className="text-xs space-y-1.5 mt-2">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                        <span className="text-[var(--text-primary)]">Account security managed by Google</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                        <span className="text-[var(--text-primary)]">Sign in with Google enabled</span>
                                    </li>
                                </ul>
                            </div>

                            <a
                                href="https://myaccount.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-all mt-4"
                            >
                                Manage Google Account
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* Password Card */}
                            <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)] mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-color)] shrink-0">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold">Password</h4>
                                            <p className="text-xs text-[var(--text-muted)]">Secure your account with a strong password</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-all"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            {/* 2FA Card */}
                            <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0110 0v4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold">Two-Factor Authentication</h4>
                                            <p className="text-xs text-[var(--text-muted)]">Status: Not enabled</p>
                                        </div>
                                    </div>
                                    <button
                                        className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-all opacity-50 cursor-not-allowed"
                                        disabled
                                    >
                                        Enable
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {/* Connected Accounts */}
                <section>
                    <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-secondary)]">
                            {isGoogleAccount
                                ? "Your account is connected with Google."
                                : "No external accounts connected."}
                        </p>
                    </div>
                </section>
            </div>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Change Password</h2>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-muted)] transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">Current Password</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--primary-light)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--primary-light)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--primary-light)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword}
                                className="w-full bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10"
                            >
                                {passwordLoading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}