import { useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { apiCall } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { useToastStore } from '../store/toastStore';
import { useSettingsStore } from '../store/settingsStore';
import { BACKEND_URL } from '../config';

export interface ChatWebSocketCallbacks {
    onNewMessage: (roomId: string, message: { content: string; username: string; sent_at: string; type?: string }) => void;
}

interface UseChatWebSocketOptions {
    roomId: string;
    callbacks: ChatWebSocketCallbacks;
}

export function useChatWebSocket({ roomId, callbacks }: UseChatWebSocketOptions) {
    const { user, token } = useAuthStore();
    const { setMessages } = useChatStore();
    const { showToast } = useToastStore();
    const ws = useRef<WebSocket | null>(null);
    const resolvedRoomId = useRef<string>('');
    const signalQueue = useRef<Array<{ type: string, payload: object, toId: number }>>([]);

    const flushSignalQueue = useCallback(() => {
        while (signalQueue.current.length > 0 && ws.current?.readyState === WebSocket.OPEN) {
            const { type, payload, toId } = signalQueue.current.shift()!;
            console.log(`Kirim sinyal ${type} ke user ${toId}`);
            ws.current.send(JSON.stringify({
                type,
                to_id: toId,
                ...payload
            }));
        }
    }, []);

    const getWsUrl = useCallback((targetRoomId: string) => {
        const wsBaseUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        return `${wsBaseUrl}/ws/${targetRoomId}?token=${token}`;
    }, [token]);

    const connectWs = useCallback((targetRoomId?: string): WebSocket => {
        const actualRoomId = targetRoomId || roomId;
        const newWs = new WebSocket(getWsUrl(actualRoomId));
        (newWs as any).roomId = actualRoomId;
        ws.current = newWs;

        newWs.onopen = () => {
            console.log('Connected to WS', roomId);
            flushSignalQueue();
        };

        newWs.onmessage = (event) => {
            try {
                const msg: any = JSON.parse(event.data);

                if (msg.type === 'chat') {
                    if (msg.user_id !== user?.id) {
                        const settings = useSettingsStore.getState();
                        if (settings.read_receipts) {
                            apiCall(`/room/${actualRoomId}/read`, { method: 'PUT' }).catch(console.error);
                        }
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, { ...msg, status: 'sent' }];
                        });
                        callbacks.onNewMessage?.(actualRoomId, {
                            content: msg.content,
                            username: msg.username,
                            sent_at: msg.time_stamp,
                        });
                    }
                    return;
                }

                if (msg.type === 'sent') {
                    if (msg.user_id !== user?.id) return;

                    setMessages(prev => {
                        let updated = false;
                        return prev.map(m => {
                            if (!updated && m.local_id && m.status === 'pending' && m.user_id === user?.id) {
                                updated = true;
                                return { ...m, status: 'sent', id: msg.id };
                            }
                            return m;
                        });
                    });
                    return;
                }

                if (msg.type === 'readed') {
                    if (msg.user_id !== user?.id) {
                        setMessages(prev =>
                            prev.map(m =>
                                m.user_id === user?.id && m.status === 'sent'
                                    ? { ...m, status: 'read' }
                                    : m
                            )
                        );
                    }
                    return;
                }

                if (msg.type === 'leave' && msg.user_id === user?.id) {
                    setIsKicked(true);
                    showToast('You have been removed from this room.', 'error');
                    const { rooms, setRooms, allRooms, setAllRooms } = useDashboardStore.getState();
                    setRooms(rooms.filter(r => r.id !== actualRoomId));
                    setAllRooms(allRooms.filter(r => r.id !== actualRoomId));
                }

                if (msg.type === 'sticker') {
                    if (msg.user_id !== user?.id) {
                        const settings = useSettingsStore.getState();
                        if (settings.read_receipts) {
                            apiCall(`/room/${actualRoomId}/read`, { method: 'PUT' }).catch(console.error);
                        }
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, { ...msg, status: 'sent' }];
                        });
                        callbacks.onNewMessage?.(actualRoomId, {
                            content: '🎭 Sticker',
                            username: msg.username,
                            sent_at: msg.time_stamp,
                            type: 'sticker'
                        });
                    }
                    return;
                }

                if (msg.type === 'image') {
                    if (msg.user_id !== user?.id) {
                        const settings = useSettingsStore.getState();
                        if (settings.read_receipts) {
                            apiCall(`/room/${actualRoomId}/read`, { method: 'PUT' }).catch(console.error);
                        }
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, { ...msg, status: 'sent' }];
                        });
                        callbacks.onNewMessage?.(actualRoomId, {
                            content: '📷 Image',
                            username: msg.username,
                            sent_at: msg.time_stamp,
                            type: 'image',
                        });
                    }
                    return;
                }

                if (msg.type === 'delete-message') {
                    if (msg.edited_message_id) {
                        const deletedId = msg.edited_message_id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                    }
                    return;
                }

                if (msg.type === 'update-message') {
                    return;
                }

                if (msg.type !== 'chat' && msg.type !== 'readed' && msg.type !== 'sticker'
                    && msg.type !== 'image' && msg.type !== 'delete-message' && msg.type !== 'update-message') {
                    setMessages(prev => {
                        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                }

            } catch (e) {
                console.error("Failed to parse message", e);
            }
        };

        newWs.onerror = (error) => {
            console.error('WS Error:', error);
        };

        newWs.onclose = () => {
            console.log('Disconnected from WS', roomId);
        };

        return newWs;
    }, [roomId, getWsUrl, flushSignalQueue, user?.id, setMessages, callbacks, showToast]);

    const [isKicked, setIsKicked] = useState(false);

    const sendMessage = useCallback(async (content: string, localId: string, replyToId?: string) => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
            showToast('Connection lost. Please retry.', 'error');
            return false;
        }

        try {
            ws.current.send(JSON.stringify({
                content,
                local_id: localId,
                reply_to_id: replyToId || '',
            }));
            return true;
        } catch (err) {
            showToast('Failed to send message.', 'error');
            return false;
        }
    }, [showToast]);

    const sendSticker = useCallback((url: string, localId: string, replyToId?: string) => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
            showToast('Connection lost. Please retry.', 'error');
            return false;
        }

        ws.current.send(JSON.stringify({
            content: url,
            local_id: localId,
            type: 'sticker',
            reply_to_id: replyToId || '',
        }));
        return true;
    }, [showToast]);

    const sendImage = useCallback((url: string, caption: string | undefined, localId: string, replyToId?: string) => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
            showToast('Connection lost. Please retry.', 'error');
            return false;
        }

        ws.current.send(JSON.stringify({
            content: url,
            caption,
            local_id: localId,
            type: 'image',
            reply_to_id: replyToId || '',
        }));
        return true;
    }, [showToast]);

    const disconnect = useCallback(() => {
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
    }, []);

    const getWs = useCallback(() => ws.current, []);

    return {
        ws,
        isKicked,
        setIsKicked,
        resolvedRoomId,
        signalQueue,
        connectWs,
        disconnect,
        sendMessage,
        sendSticker,
        sendImage,
        flushSignalQueue,
        getWs,
    };
}
