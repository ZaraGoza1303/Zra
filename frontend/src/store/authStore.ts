// src/store/authStore.ts
import { create } from 'zustand';
import type { User } from '../types/chat';

interface AuthState {
    token: string | null;
    user: User | null;
    lastRefreshed: Date | null;
    isAuthenticated: boolean;
    loginState: (token: string, userData: User) => void;
    logoutState: () => void;
    setAuthData: (token: string | null, userData: User | null, lastRefreshed: Date | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: localStorage.getItem('token'),
    user: (() => {
        const saved = localStorage.getItem('user');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    })(),
    lastRefreshed: (() => {
        const saved = localStorage.getItem('lastRefreshed');
        return saved ? new Date(saved) : null;
    })(),
    isAuthenticated: !!localStorage.getItem('token'),

    loginState: (newToken: string, userData: User) => {
        const now = new Date();
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('lastRefreshed', now.toISOString());
        set({
            token: newToken,
            user: userData,
            lastRefreshed: now,
            isAuthenticated: true,
        });
    },

    logoutState: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastRefreshed');
        set({
            token: null,
            user: null,
            lastRefreshed: null,
            isAuthenticated: false,
        });
    },

    setAuthData: (token, user, lastRefreshed) => {
        if (token) localStorage.setItem('token', token);
        else localStorage.removeItem('token');

        if (user) localStorage.setItem('user', JSON.stringify(user));
        else localStorage.removeItem('user');

        if (lastRefreshed) localStorage.setItem('lastRefreshed', lastRefreshed.toISOString());
        else localStorage.removeItem('lastRefreshed');

        set({
            token,
            user,
            lastRefreshed,
            isAuthenticated: !!token,
        });
    },
}));
