import { create } from 'zustand';
import { apiCall } from '../services/api';

interface UserSettings {
    profile_visibility: string;
    last_seen: string;
    read_receipts: boolean;
    message_notif: boolean;
    group_notif: boolean;
    sound: boolean;
}

interface SettingsState {
    read_receipts: boolean;
    message_notif: boolean;
    group_notif: boolean;
    sound: boolean;
    profile_visibility: string;
    last_seen: string;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    updateSettings: (updates: Partial<Omit<SettingsState, 'isLoading' | 'fetchSettings' | 'updateSettings'>>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    read_receipts: true,
    message_notif: true,
    group_notif: true,
    sound: true,
    profile_visibility: 'public',
    last_seen: 'everyone',
    isLoading: false,

    fetchSettings: async () => {
        set({ isLoading: true });
        try {
            const res = await apiCall<{ data: UserSettings }>('/user/settings');
            if (res?.data) {
                set({
                    read_receipts: res.data.read_receipts,
                    message_notif: res.data.message_notif,
                    group_notif: res.data.group_notif,
                    sound: res.data.sound,
                    profile_visibility: res.data.profile_visibility,
                    last_seen: res.data.last_seen,
                });
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    updateSettings: (updates) => {
        set((state) => ({ ...state, ...updates }));
    },
}));
