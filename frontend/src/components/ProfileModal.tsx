// src/components/ProfileModal.tsx
import React, { useState, useRef } from 'react';
import { X, Camera, Lock, User as UserIcon, Eye, EyeOff, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getUserImageUrl } from '../services/api';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserProfile {
    id: number;
    name: string;
    bio: string;
    email: string;
    profile_picture?: string;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, loginState } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(user?.profile_picture ? getUserImageUrl(user.profile_picture) : '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) { setError('File must be an image'); return; }
            if (file.size > 2 * 1024 * 1024) { setError('Image size must be less than 2MB'); return; }
            setProfilePicture(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('bio', bio);
            if (profilePicture) formData.append('profile_picture', profilePicture);

            const response = await apiCall<{ data: UserProfile }>(`/user/${user?.id}`, {
                method: 'PUT', body: formData,
            });

            if (user) {
                loginState(localStorage.getItem('token') || '', {
                    ...user,
                    name: response.data.name,
                    profile_picture: response.data.profile_picture || user.profile_picture,
                });
            }
            setSuccess('Profile updated successfully!');
            setTimeout(() => { setSuccess(''); onClose(); }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true); setError(''); setSuccess('');
        try {
            await apiCall('/user/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }),
            });
            setSuccess('Password changed successfully!');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            setTimeout(() => { setSuccess(''); onClose(); }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const PasswordField = ({
        label, value, onChange, show, onToggle
    }: {
        label: string;
        value: string;
        onChange: (v: string) => void;
        show: boolean;
        onToggle: () => void;
    }) => (
        <div className="input-group">
            <label className="input-label">{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    type={show ? 'text' : 'password'}
                    className="input-field"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required
                    style={{ paddingRight: '40px' }}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center',
                    }}
                >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );

    return (
        <div
            onClick={onClose}
            className="animate-fade-in"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                className="glass-panel animate-slide-up"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90%', maxWidth: '400px',
                    maxHeight: '90vh', overflowY: 'auto',
                    padding: '24px',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '20px',
                }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Profile Settings</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: '8px',
                    marginBottom: '20px',
                    borderBottom: '1px solid var(--glass-border)',
                    paddingBottom: '12px',
                }}>
                    {(['profile', 'password'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px',
                                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                borderRadius: 'var(--border-radius-sm)',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                                fontSize: '0.9rem',
                            }}
                        >
                            {tab === 'profile' ? <UserIcon size={18} /> : <Lock size={18} />}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Alerts */}
                {error && (
                    <div style={{
                        padding: '12px', borderRadius: 'var(--border-radius-sm)',
                        marginBottom: '16px', fontSize: '0.875rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>{error}</div>
                )}
                {success && (
                    <div style={{
                        padding: '12px', borderRadius: 'var(--border-radius-sm)',
                        marginBottom: '16px', fontSize: '0.875rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--success)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}>{success}</div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Avatar Upload */}
                        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 4px' }}>
                            <div style={{
                                width: '100%', height: '100%',
                                borderRadius: '50%', overflow: 'hidden',
                                border: '3px solid var(--primary)',
                                boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                            }}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Profile"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '3rem', fontWeight: 'bold', color: 'white',
                                    }}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'var(--primary)', color: 'white',
                                    border: '2px solid var(--glass-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <Camera size={16} />
                            </button>
                            <input
                                type="file" ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Name</label>
                            <input
                                type="text" className="input-field"
                                value={name} onChange={e => setName(e.target.value)} required
                            />
                        </div>


                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <input
                                type="email" className="input-field"
                                value={user?.email || ''} disabled
                                style={{ opacity: 0.7, cursor: 'not-allowed' }}
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                Email cannot be changed
                            </small>
                        </div>



                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading || (name === user?.name && !profilePicture)}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <PasswordField
                            label="Current Password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            show={showCurrentPassword}
                            onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
                        />
                        <PasswordField
                            label="New Password"
                            value={newPassword}
                            onChange={setNewPassword}
                            show={showNewPassword}
                            onToggle={() => setShowNewPassword(!showNewPassword)}
                        />
                        <PasswordField
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            show={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                        />

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                        >
                            <Lock size={18} />
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}