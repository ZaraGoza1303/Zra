import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useToastStore } from '../../store/toastStore';

interface UserSettings {
    profile_visibility: string;
    last_seen: string;
    read_receipts: boolean;
    message_notif: boolean;
    group_notif: boolean;
    sound: boolean;
    preview: boolean;
}

export default function NotificationSettings() {
    const { showToast } = useToastStore();
    const [loading, setLoading] = useState(true);

    const [messageNotifications, setMessageNotifications] = useState(true);
    const [groupNotifications, setGroupNotifications] = useState(true);
    const [sound, setSound] = useState(true);
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await apiCall<{ data: UserSettings }>('/user/settings');
            if (res?.data) {
                setMessageNotifications(res.data.message_notif);
                setGroupNotifications(res.data.group_notif);
                setSound(res.data.sound);
                setShowPreview(res.data.preview);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateNotificationSettings = async (key: string, value: boolean) => {
        try {
            await apiCall('/user/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    [key]: value,
                }),
            });
        } catch (err: any) {
            showToast(err.message || 'Failed to save settings', 'error');
        }
    };

    const handleMessageNotifChange = (value: boolean) => {
        setMessageNotifications(value);
        updateNotificationSettings('message_notif', value);
    };

    const handleGroupNotifChange = (value: boolean) => {
        setGroupNotifications(value);
        updateNotificationSettings('group_notif', value);
    };

    const handleSoundChange = (value: boolean) => {
        setSound(value);
        updateNotificationSettings('sound', value);
    };

    const handlePreviewChange = (value: boolean) => {
        setShowPreview(value);
        updateNotificationSettings('preview', value);
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
                <h1 className="text-[var(--accent-color)] font-bold text-lg">Notifications</h1>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Manage how you receive notifications</p>
            </div>

            <div className="px-10 py-8 max-w-2xl">
                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <MessageSquare size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Message Notifications</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Enable message notifications</p>
                                <p className="text-xs text-[var(--text-secondary)]">Get notified when you receive new messages</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={messageNotifications}
                                    onChange={(e) => handleMessageNotifChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Group Notifications</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Enable group notifications</p>
                                <p className="text-xs text-[var(--text-secondary)]">Get notified about group activity</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={groupNotifications}
                                    onChange={(e) => handleGroupNotifChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        {sound ? <Volume2 size={20} className="text-[var(--accent-color)]" /> : <VolumeX size={20} className="text-[var(--accent-color)]" />}
                        <h2 className="text-lg font-semibold">Sound</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Notification sound</p>
                                <p className="text-xs text-[var(--text-secondary)]">Play sound when receiving notifications</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sound}
                                    onChange={(e) => handleSoundChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell size={20} className="text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Message Preview</h2>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Show message preview</p>
                                <p className="text-xs text-[var(--text-secondary)]">Show message content in notifications</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showPreview}
                                    onChange={(e) => handlePreviewChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
                            </label>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-secondary)]">
                            These settings affect notifications on this device. Note that notification preferences may vary across different devices.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
