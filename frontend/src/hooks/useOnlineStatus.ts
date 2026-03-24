import { useState, useCallback } from 'react';
import { apiCall } from '../services/api';

export function useOnlineStatus() {
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

    const fetchOnlineUsers = useCallback(async () => {
        try {
            const res = await apiCall<{ data: number[] }>(`/user/online?t=${Date.now()}`, { method: 'GET' });
            setOnlineUserIds(new Set(res.data || []));
        } catch (e) {
            console.error('Failed to fetch online users', e);
        }
    }, []);

    const setUserOnline = useCallback((userId: number) => {
        setOnlineUserIds(prev => new Set([...prev, Number(userId)]));
    }, []);

    const setUserOffline = useCallback((userId: number) => {
        setOnlineUserIds(prev => {
            const next = new Set(prev);
            next.delete(Number(userId));
            return next;
        });
    }, []);

    return {
        onlineUserIds,
        setOnlineUserIds,
        fetchOnlineUsers,
        setUserOnline,
        setUserOffline,
    };
}
