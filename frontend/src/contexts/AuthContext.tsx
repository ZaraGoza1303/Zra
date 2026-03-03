// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import type { User } from '../types/chat';

interface AuthContextType {
    token: string | null;
    user: User | null;
    loginState: (token: string, userData: User) => void;
    logoutState: () => void;
    isAuthenticated: boolean;
    refreshToken: () => Promise<boolean>;
    lastRefreshed: Date | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 menit
const TOKEN_REFRESH_URL = '/api/auth/refresh';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('user');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(() => {
        const saved = localStorage.getItem('lastRefreshed');
        return saved ? new Date(saved) : null;
    });

    // Ganti NodeJS.Timeout dengan number (untuk browser)
    const refreshTimeoutRef = useRef<number | null>(null);
    const isRefreshingRef = useRef<boolean>(false);

    const loginState = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        const now = new Date();
        setLastRefreshed(now);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('lastRefreshed', now.toISOString());
    };

    const logoutState = useCallback(() => {
        setToken(null);
        setUser(null);
        setLastRefreshed(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastRefreshed');

        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
    }, []);

    const refreshToken = useCallback(async (): Promise<boolean> => {
        if (isRefreshingRef.current) {
            console.log('Refresh already in progress, skipping...');
            return false;
        }

        const currentToken = token || localStorage.getItem('token');
        const currentUser = user || (() => {
            const saved = localStorage.getItem('user');
            try {
                return saved ? JSON.parse(saved) : null;
            } catch {
                return null;
            }
        })();

        if (!currentToken || !currentUser?.refresh_token) {
            console.log('No token or refresh token available');
            return false;
        }

        isRefreshingRef.current = true;

        try {
            console.log('Attempting to refresh token...');

            // Di Vite, pake import.meta.env bukan process.env
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}${TOKEN_REFRESH_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: currentUser.refresh_token
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Token refresh failed');
            }

            if (data.data) {
                const newToken = data.data.access_token;
                const newRefreshToken = data.data.refresh_token;

                const updatedUser = {
                    ...currentUser,
                    refresh_token: newRefreshToken
                };

                const now = new Date();

                setToken(newToken);
                setUser(updatedUser);
                setLastRefreshed(now);

                localStorage.setItem('token', newToken);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                localStorage.setItem('lastRefreshed', now.toISOString());

                console.log('Token refreshed successfully at', now.toLocaleTimeString());
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to refresh token:', error);

            if (error instanceof Error &&
                (error.message.includes('expired') || error.message.includes('invalid'))) {
                console.log('Refresh token expired or invalid, logging out...');
                logoutState();
            }

            return false;
        } finally {
            isRefreshingRef.current = false;
        }
    }, [token, user, logoutState]);

    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }

        if (!token || !user) {
            return;
        }

        refreshTimeoutRef.current = window.setTimeout(async () => {
            console.log('Scheduled token refresh triggered');
            const success = await refreshToken();

            if (success) {
                scheduleRefresh();
            }
        }, REFRESH_INTERVAL) as unknown as number;

        console.log('Next refresh scheduled in', REFRESH_INTERVAL / 1000 / 60, 'minutes');
    }, [token, user, refreshToken]);

    useEffect(() => {
        if (token && user) {
            if (lastRefreshed) {
                const timeSinceLastRefresh = Date.now() - lastRefreshed.getTime();
                const timeUntilNextRefresh = REFRESH_INTERVAL - timeSinceLastRefresh;

                if (timeUntilNextRefresh <= 0) {
                    refreshToken().then(success => {
                        if (success) scheduleRefresh();
                    });
                } else {
                    refreshTimeoutRef.current = window.setTimeout(async () => {
                        console.log('Scheduled token refresh triggered');
                        const success = await refreshToken();
                        if (success) scheduleRefresh();
                    }, timeUntilNextRefresh) as unknown as number;

                    console.log('Next refresh scheduled in', timeUntilNextRefresh / 1000 / 60, 'minutes');
                }
            } else {
                scheduleRefresh();
            }
        }

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
        };
    }, [token, user, lastRefreshed, refreshToken, scheduleRefresh]);

    return (
        <AuthContext.Provider value={{
            token,
            user,
            loginState,
            logoutState,
            isAuthenticated: !!token,
            refreshToken,
            lastRefreshed
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};