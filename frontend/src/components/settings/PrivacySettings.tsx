import { useState, useEffect } from 'react';
import { Shield, Users, Eye, EyeOff, UserX, Loader2 } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useToastStore } from '../../store/toastStore';

interface BlockedUser {
    id: number;
    name: string;
    username: string;
    profile_picture?: string;
}

interface UserSettings {
    profile_visibility: string;
    last_seen: string;
    read_receipts: boolean;
    message_notif: boolean;
    group_notif: boolean;
    sound: boolean;
    preview: boolean;
}

interface PrivacySettingsProps {
}

export default function PrivacySettings({ }: PrivacySettingsProps) {
    const { showToast } = useToastStore();
    const [loading, setLoading] = useState(true);

    const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>('public');
    const [lastSeen, setLastSeen] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
    const [readReceipts, setReadReceipts] = useState(true);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [unblockingId, setUnblockingId] = useState<number | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchBlockedUsers();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await apiCall<{ data: UserSettings }>('/user/settings');
            if (res?.data) {
                setProfileVisibility(res.data.profile_visibility as 'public' | 'friends' | 'private');
                setLastSeen(res.data.last_seen as 'everyone' | 'friends' | 'nobody');
                setReadReceipts(res.data.read_receipts);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBlockedUsers = async () => {
        try {
            const res = await apiCall<{ data: BlockedUser[] }>('/user/blocked-list');
            if (res?.data) {
                setBlockedUsers(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch blocked users:', err);
        }
    };

    const updatePrivacySettings = async () => {
        try {
            await apiCall('/user/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    profile_visibility: profileVisibility,
                    last_seen: lastSeen,
                    read_receipts: readReceipts,
                }),
            });
        } catch (err: any) {
            showToast(err.message || 'Failed to save settings', 'error');
        }
    };

    const handleVisibilityChange = (value: 'public' | 'friends' | 'private') => {
        setProfileVisibility(value);
        updatePrivacySettings();
    };

    const handleLastSeenChange = (value: 'everyone' | 'friends' | 'nobody') => {
        setLastSeen(value);
        updatePrivacySettings();
    };

    const handleReadReceiptsChange = (value: boolean) => {
        setReadReceipts(value);
        updatePrivacySettings();
    };

    const handleUnblock = async (userId: number) => {
        setUnblockingId(userId);
        try {
            await apiCall(`/user/block/${userId}`, { method: 'DELETE' });
            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            showToast('User unblocked');
        } catch (err: any) {
            showToast(err.message || 'Failed to unblock user', 'error');
        } finally {
            setUnblockingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--accent-color)]" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans h-full">
            <div className="px-10 py-8 border-b border-[var(--border-color)]">
                <h1 className="text-[var(--accent-color)] font-bold text-lg">Privacy & Safety</h1>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Control who can see your information and interact with you</p>
            </div>

            <div className="px-10 py-8 max-w-2xl">
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Eye size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Profile Visibility</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            Who can see your profile information
                        </p>

                        <div className="space-y-3">
                            {[
                                { value: 'public', label: 'Public', desc: 'Everyone can see your profile' },
                                { value: 'friends', label: 'Friends Only', desc: 'Only your friends can see your profile' },
                                { value: 'private', label: 'Private', desc: 'Only you can see your profile' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${profileVisibility === option.value
                                        ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/30'
                                        : 'bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent-color)]/30'
                                        }`}
                                >
                                    <div>
                                        <p className="text-sm font-medium">{option.label}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{option.desc}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value={option.value}
                                        checked={profileVisibility === option.value}
                                        onChange={() => handleVisibilityChange(option.value as typeof profileVisibility)}
                                        className="w-4 h-4 accent-[var(--accent-color)]"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <EyeOff size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Last Seen</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            Control who can see when you were last online
                        </p>

                        <div className="space-y-3">
                            {[
                                { value: 'everyone', label: 'Everyone', desc: 'Anyone can see when you were last online' },
                                { value: 'friends', label: 'Friends Only', desc: 'Only your friends can see when you were online' },
                                { value: 'nobody', label: 'Nobody', desc: 'Your last seen will be hidden from everyone' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${lastSeen === option.value
                                        ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/30'
                                        : 'bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent-color)]/30'
                                        }`}
                                >
                                    <div>
                                        <p className="text-sm font-medium">{option.label}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{option.desc}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        name="lastseen"
                                        value={option.value}
                                        checked={lastSeen === option.value}
                                        onChange={() => handleLastSeenChange(option.value as typeof lastSeen)}
                                        className="w-4 h-4 accent-[var(--accent-color)]"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mb-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-color)]">
                                <Users size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Read Receipts</h2>
                                <p className="text-sm text-[var(--text-secondary)]">Let others see when you've read their messages</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={readReceipts}
                                onChange={(e) => handleReadReceiptsChange(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
                        </label>
                    </div>
                </section>

                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <UserX size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Blocked Users</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        {blockedUsers.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-[var(--text-secondary)]">
                                    No blocked users yet. Blocked users won't be able to send you messages or see your profile.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {blockedUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-xl"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">@{user.username}</p>
                                        </div>
                                        <button
                                            onClick={() => handleUnblock(user.id)}
                                            disabled={unblockingId === user.id}
                                            className="text-xs text-[var(--accent-color)] hover:underline disabled:opacity-50"
                                        >
                                            {unblockingId === user.id ? <Loader2 size={14} className="animate-spin" /> : 'Unblock'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)] flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent-color)] shrink-0">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold">Your Privacy Matters</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                We take your privacy seriously. Your data is never shared with third parties.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
