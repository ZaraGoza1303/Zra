// src/components/ChatRoom.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { apiCall } from '../../services/api';
import { BACKEND_URL } from '../../config';
import ChatHeader from './ChatHeader';
import MessageList from '../message/MessageList';
import MessageInput, { type MessageInputHandle } from '../message/MessageInput';
import RoomInfoSidebar from './RoomInfoSidebar';
import PreviewPictureModal from '../ui/PreviewPictureModal';
import MembersModal from './MembersModal';
import type { Message, ChatRoomProps, RoomMember, RoomResponse, UserProfile, SocialLink } from '../../types/chat';
import { useDashboardStore } from '../../store/dashboardStore';
import { useToastStore } from '../../store/toastStore';
import { useSettingsStore } from '../../store/settingsStore';

export default function ChatRoom({ roomId, roomName, roomPicture, roomType, onBack, onNewMessage, onRoomResolved, onlineUserIds, privatePartnerInfo, onOpenDM }: ChatRoomProps) {
    const isPrivate = roomType === 'private';
    const { user, token } = useAuthStore();
    const { updateRoom } = useDashboardStore();
    const isPendingRoom = roomId.startsWith('pending:');
    const messageInputRef = useRef<MessageInputHandle>(null);
    const resolvedRoomId = useRef<string>('');

    // Refs for stable dependencies in useEffect
    const userRef = useRef(user);
    const tokenRef = useRef(token);
    const privatePartnerInfoRef = useRef(privatePartnerInfo);
    const isPrivateRef = useRef(isPrivate);

    // Keep refs updated
    userRef.current = user;
    tokenRef.current = token;
    privatePartnerInfoRef.current = privatePartnerInfo;
    isPrivateRef.current = isPrivate;

    // Ref to prevent concurrent initialization
    const isInitializing = useRef(false);

    const {
        messages, setMessages,
        input, setInput,
        replyTo, setReplyTo,
        hasMore, setHasMore,
        loadingMore, setLoadingMore,
        roomMembers, setRoomMembers,
        setTotalMemberCount,
        setActiveMemberCount,
        setFetchingMembers,
        roomDetails, setRoomDetails,
        setFetchingInfo,
        setFetchingHistory,
        setFriendsList,
        showUsersModal, setShowUsersModal,
        showInfoModal, setShowInfoModal,
        setTargetUserId,
        setActionLoading,
        setPrivatePartner,
        setEditingName,
        setEditingDesc,
        setEditLoading,
        resetChatState,
        setActiveMembers,
        setMutualRooms,
        setTyping
    } = useChatStore();

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pictureInputRef = useRef<HTMLInputElement>(null);
    const [isKicked, setIsKicked] = useState(false);
    const [creatingDM, setCreatingDM] = useState(false);
    const signalQueue = useRef<Array<{ type: string, payload: object, toId: number }>>([])

    const { showToast } = useToastStore();

    // Check if current user is admin
    const isAdmin = roomMembers.some(m => m.user_id === user?.id && m.role === 'admin');

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (container.scrollTop === 0 && hasMore && !loadingMore) {
            const oldestMsg = messages[0];
            if (!oldestMsg?.time_stamp) return;

            const prevScrollHeight = container.scrollHeight;

            await fetchChatHistory(oldestMsg.time_stamp);

            // Restore scroll position setelah messages prepend
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop =
                        messagesContainerRef.current.scrollHeight - prevScrollHeight;
                }
            });
        }
    };

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

    // AFTER
    const fetchChatHistory = async (lastTimestamp?: string) => {
        console.log('[DEBUG-FETCH-HISTORY] Called with lastTimestamp:', lastTimestamp, 'roomId:', roomId);
        if (lastTimestamp) {
            setLoadingMore(true);
        } else {
            setFetchingHistory(true);
        }
        try {
            const url = lastTimestamp
                ? `/room/${roomId}/history?limit=20&last_timestamp=${encodeURIComponent(lastTimestamp)}`
                : `/room/${roomId}/history?limit=20`;
            console.log('[DEBUG-FETCH-HISTORY] Fetching URL:', url);

            const resp = await apiCall<{ data: Message[] }>(url, { method: 'GET' });
            console.log('[DEBUG-FETCH-HISTORY] Response:', resp);
            const newMessages = (resp.data || []).map((m: Message) => ({
                ...m,
                status: m.user_id === user?.id ? (m.is_read ? 'read' as const : 'sent' as const) : undefined,
            }));
            console.log('[DEBUG-FETCH-HISTORY] newMessages count:', newMessages.length);

            if (lastTimestamp) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map((m: Message) => m.id));
                    const filtered = newMessages.filter((m: Message) => !existingIds.has(m.id));
                    return [...filtered, ...prev];
                });
            } else {
                setMessages(newMessages);
            }

            setHasMore(newMessages.length === 20);
        } catch (e) {
            console.error('[DEBUG-FETCH-HISTORY] Failed to fetch chat history', e);
        } finally {
            setFetchingHistory(false);
            setLoadingMore(false);
        }
    };

    const refreshRoomData = async () => {
        try {
            // Ambil data detail room terbaru
            const resp = await apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' });
            const updatedData = resp.data;

            // Update state lokal (untuk sidebar yang sedang terbuka)
            setRoomDetails(updatedData);

            // Update dashboard store (agar list chat di kiri berubah seketika)
            updateRoom(roomId, {
                name: updatedData.name,
                picture: updatedData.picture,
                description: updatedData.description,
                // Jika ada field lain yang relevan di dashboardStore
            });

            console.log("Room data synchronized with server signal.");
        } catch (err) {
            console.error("Failed to sync room data after signal", err);
        }
    };

    const fetchPartnerInfo = async () => {
        try {
            const resp = await apiCall<{ data: RoomMember[] }>(`/room/${roomId}/members`, { method: 'GET' });
            const members = resp.data || [];
            const partner = members.find(m => m.user_id !== user?.id);
            if (partner) {
                let socialLinks: SocialLink[] = [];
                try {
                    const socialResp = await apiCall<{ data: SocialLink[] }>(`/user/social-links/${partner.user_id}`, { method: 'GET' });
                    socialLinks = socialResp.data || [];
                } catch (socialErr) {
                    console.log("No social links found for user");
                }

                setPrivatePartner({
                    user_id: partner.user_id,
                    username: partner.username,
                    user_profile_picture: partner.user_profile_picture,
                    user_bio: partner.user_bio,
                    is_verified: partner.is_verified,
                    created_at: partner.created_at,
                    social_links: socialLinks,
                });
            }
        } catch (e) {
            console.error("Failed to fetch partner info", e);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const messageContent = input.trim();
        const localId = `local_${Date.now()}_${Math.random()}`;

        if (isPendingRoom) {
            if (creatingDM) return;
            setCreatingDM(true);
            const targetId = roomId.replace('pending:', '');
            try {
                // 1. Create/Get DM room
                const res = await apiCall<{ data: any }>(`/room/${targetId}/private`, { method: 'POST' });

                // Handle both array (existing room) and string (new room) response
                let newRoomId: string;
                if (Array.isArray(res.data)) {
                    newRoomId = res.data[0]?.id;  // Room exists - use existing
                } else {
                    newRoomId = res.data;  // New room - use new ID
                }

                if (!newRoomId) {
                    throw new Error('Failed to get room ID');
                }

                // 2. Send first message via HTTP (not WS) to ensure it's saved in DB
                const timestamp = new Date().toISOString();
                await apiCall(`/room/${newRoomId}/message`, {
                    method: 'POST',
                    body: JSON.stringify({ content: messageContent, local_id: localId }),
                    headers: { 'Content-Type': 'application/json' }
                });

                // 3. Create optimistic message for immediate UI update
                const optimisticMsg: Message = {
                    id: '',
                    room_id: newRoomId,
                    local_id: localId,
                    content: messageContent,
                    username: user?.username || '',
                    user_id: user?.id,
                    time_stamp: timestamp,
                    type: 'chat',
                    status: 'sent',
                    reply_to: replyTo ?? undefined,
                    reply_to_id: replyTo?.id || '',
                };
                setMessages([optimisticMsg]);
                setInput('');

                // 4. Trigger room resolved - ChatRoom will remount and fetchChatHistory will find the message
                onNewMessage?.(newRoomId, {
                    content: messageContent,
                    username: user?.username || '',
                    name: user?.name,
                    user_id: user?.id,
                    profile_picture: user?.profile_picture,
                    sent_at: timestamp,
                });
                onRoomResolved?.(newRoomId);
                setReplyTo(null);
            } catch (err) {
                console.error('[DEBUG-ERROR] Failed to create DM room:', err);
                showToast('Failed to create DM room', 'error');
            } finally {
                setCreatingDM(false);
            }
            return;
        }

        const optimisticMsg: Message = {
            id: '',
            room_id: roomId,
            local_id: localId,
            content: messageContent,
            username: user?.username || '',
            user_id: user?.id,
            time_stamp: new Date().toISOString(),
            type: 'chat',
            status: 'pending',
            reply_to: replyTo ?? undefined,
            reply_to_id: replyTo?.id || '',
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');

        // Coba kirim, kalau WS tidak ready → tandai failed
        if (ws.current?.readyState !== WebSocket.OPEN) {
            setMessages(prev =>
                prev.map(m => m.local_id === localId ? { ...m, status: 'failed' } : m)
            );
            showToast('Connection lost. Please retry.', 'error');
            return;
        }

        try {
            onNewMessage?.(roomId, {
                content: messageContent,
                username: user?.username || '',
                name: user?.name,
                user_id: user?.id,
                profile_picture: user?.profile_picture,
                sent_at: new Date().toISOString(),
            });
            ws.current.send(JSON.stringify({
                content: messageContent,
                local_id: localId,
                reply_to_id: replyTo?.id || '',
            }));
            setReplyTo(null);

        } catch (err) {
            setMessages(prev =>
                prev.map(m => m.local_id === localId ? { ...m, status: 'failed' } : m)
            );
            showToast('Failed to send message.', 'error');
        }
    };

    const sendSticker = (stickerUrl: string) => {
        const localId = `local_${Date.now()}_${Math.random()}`;

        const optimisticMsg: Message = {
            id: '',
            room_id: roomId,
            local_id: localId,
            content: stickerUrl,
            username: user?.username || '',
            user_id: user?.id,
            time_stamp: new Date().toISOString(),
            type: 'sticker',
            status: 'pending',
            reply_to: replyTo ?? undefined,
            reply_to_id: replyTo?.id || '',
        };

        setMessages(prev => [...prev, optimisticMsg]);

        if (ws.current?.readyState !== WebSocket.OPEN) {
            setMessages(prev =>
                prev.map(m => m.local_id === localId ? { ...m, status: 'failed' } : m)
            );
            showToast('Connection lost. Please retry.', 'error');
            return;
        }

        ws.current.send(JSON.stringify({
            content: stickerUrl,
            local_id: localId,
            type: 'sticker',
            reply_to_id: replyTo?.id || '',
        }));

        onNewMessage?.(roomId, {
            content: '🎭 Sticker',
            username: user?.username || '',
            name: user?.name,
            user_id: user?.id,
            profile_picture: user?.profile_picture,
            sent_at: new Date().toISOString(),
            type: 'sticker',
        });

        setReplyTo(null);
    };

    const sendImage = (imageUrl: string, caption?: string) => {
        const localId = `local_${Date.now()}_${Math.random()}`;

        const optimisticMsg: Message = {
            id: '',
            room_id: roomId,
            local_id: localId,
            content: imageUrl,
            caption: caption,
            username: user?.username || '',
            user_id: user?.id,
            time_stamp: new Date().toISOString(),
            type: 'image',
            status: 'pending',
            reply_to: replyTo ?? undefined,
            reply_to_id: replyTo?.id || '',
        };

        setMessages(prev => [...prev, optimisticMsg]);

        if (ws.current?.readyState !== WebSocket.OPEN) {
            setMessages(prev =>
                prev.map(m => m.local_id === localId ? { ...m, status: 'failed' } : m)
            );
            showToast('Connection lost. Please retry.', 'error');
            return;
        }

        ws.current.send(JSON.stringify({
            content: imageUrl,
            caption: caption,
            local_id: localId,
            type: 'image',
            reply_to_id: replyTo?.id || '',
        }));

        onNewMessage?.(roomId, {
            content: caption ? `📷 ${caption}` : '📷 Image',
            username: user?.username || '',
            name: user?.name,
            user_id: user?.id,
            profile_picture: user?.profile_picture,
            sent_at: new Date().toISOString(),
            type: 'image',
        });

        setReplyTo(null);
    };

    const retryMessage = (localId: string, content: string) => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
            showToast('Still disconnected.', 'error');
            return;
        }
        setMessages(prev =>
            prev.map(m => m.local_id === localId ? { ...m, status: 'pending' } : m)
        );
        try {
            ws.current.send(JSON.stringify({ content, local_id: localId }));
        } catch {
            setMessages(prev =>
                prev.map(m => m.local_id === localId ? { ...m, status: 'failed' } : m)
            );
        }
    };

    const connectWs = (targetRoomId?: string): WebSocket => {
        const actualRoomId = targetRoomId || roomId; // <-- simpan di variable lokal
        const wsBaseUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        const newWs = new WebSocket(`${wsBaseUrl}/ws/${actualRoomId}?token=${token}`);
        (newWs as any).roomId = actualRoomId;
        ws.current = newWs;

        ws.current.onopen = () => {
            console.log('Connected to WS', roomId);
            flushSignalQueue(); // ← flush semua signal yang nyangkut
        };

        ws.current.onmessage = (event) => {
            try {
                const msg: any = JSON.parse(event.data);
                console.log('[WS-RECEIVE] Room:', actualRoomId, 'Type:', msg.type, 'ID:', msg.id, 'UserID:', msg.user_id);

                if (msg.type === 'chat') {
                    if (msg.user_id !== user?.id) {
                        const settings = useSettingsStore.getState();
                        const isActive = useDashboardStore.getState().selectedRoom?.id === actualRoomId ||
                            useDashboardStore.getState().dmRoom?.id === actualRoomId;

                        if (settings.read_receipts && isActive) {
                            apiCall(`/room/${actualRoomId}/read`, { method: 'PUT' }).catch(console.error);
                        }
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) {
                                return prev;
                            }
                            return [...prev, { ...msg, status: 'sent' }];
                        });
                        onNewMessage?.(actualRoomId, {
                            content: msg.content,
                            username: msg.username,
                            name: msg.name,
                            user_id: msg.user_id,
                            profile_picture: msg.profile_picture,
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
                    const settings = useSettingsStore.getState();
                    if (settings.read_receipts) {
                        if (msg.user_id !== user?.id) {
                            setMessages(prev =>
                                prev.map(m =>
                                    m.user_id === user?.id && m.status === 'sent'
                                        ? { ...m, status: 'read' }
                                        : m
                                )
                            );
                        }
                    }
                    return;
                }

                if (msg.type === 'update-room') {
                    refreshRoomData();
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
                        const isActive = useDashboardStore.getState().selectedRoom?.id === actualRoomId ||
                            useDashboardStore.getState().dmRoom?.id === actualRoomId;

                        if (settings.read_receipts && isActive) {
                            apiCall(`/room/${actualRoomId}/read`, { method: 'PUT' }).catch(console.error);
                        }
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, { ...msg, status: 'sent' }];
                        });
                        onNewMessage?.(actualRoomId, {
                            content: '🎭 Sticker',
                            username: msg.username,
                            name: msg.name,
                            user_id: msg.user_id,
                            profile_picture: msg.profile_picture,
                            sent_at: msg.time_stamp,
                            type: 'sticker'
                        });
                    }
                    return;
                }

                if (msg.type === 'image') {
                    if (msg.user_id !== user?.id) {
                        const settings = useSettingsStore.getState();
                        const isActive = useDashboardStore.getState().selectedRoom?.id === actualRoomId ||
                            useDashboardStore.getState().dmRoom?.id === actualRoomId;

                        if (settings.read_receipts && isActive) {
                            apiCall(`/room/${actualRoomId}/read`, { method: 'PUT' }).catch(console.error);
                        }
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, { ...msg, status: 'sent' }];
                        });
                        onNewMessage?.(actualRoomId, {
                            content: '📷 Image',
                            username: msg.username,
                            name: msg.name,
                            user_id: msg.user_id,
                            profile_picture: msg.profile_picture,
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

                if (msg.type === 'typing') {
                    if (msg.user_id !== user?.id) {
                        const isTyping = msg.content === 'true';
                        setTyping(actualRoomId, msg.user_id, msg.username, isTyping);
                    }
                    return;
                }

                if (msg.type !== 'chat' && msg.type !== 'readed' && msg.type !== 'sticker'
                    && msg.type !== 'image' && msg.type !== 'delete-message' && msg.type !== 'update-message'
                    && msg.type !== 'typing') {
                    setMessages(prev => {
                        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                }

            } catch (e) {
                console.error("Failed to parse message", e);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WS Error:', error);
        };

        ws.current.onclose = () => {
            console.log('Disconnected from WS', roomId);
        };

        return ws.current;
    };


    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            window.dispatchEvent(new CustomEvent('initiate-call', { detail }));
        };
        window.addEventListener('initiate-call-from-header', handler);
        return () => window.removeEventListener('initiate-call-from-header', handler);
    }, []);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Use refs for stable values
        const currentUser = userRef.current;
        const currentToken = tokenRef.current;

        console.log('[DEBUG-USEFFECT-MAIN] Triggered! roomId:', roomId, 'isPendingRoom:', isPendingRoom, 'user:', !!currentUser, 'token:', !!currentToken);
        if (!roomId || !currentUser || !currentToken) {
            console.log('[DEBUG-USEFFECT-MAIN] Early return - missing roomId/user/token');
            return;
        }

        // Set active room WS status handled in connectWs onopen
        if (isPendingRoom) {
            console.log('[DEBUG-USEFFECT] Pending room branch, resolvedRoomId.current:', resolvedRoomId.current, 'roomId:', roomId);

            // Set partner info immediately from props so header shows it
            const partnerInfo = privatePartnerInfoRef.current;
            if (partnerInfo) {
                console.log('[DEBUG-USEFFECT] Setting privatePartner:', partnerInfo);
                setPrivatePartner({
                    user_id: partnerInfo.user_id,
                    username: partnerInfo.username,
                    user_profile_picture: partnerInfo.user_profile_picture,
                    user_bio: partnerInfo.user_bio,
                    social_links: [],
                });
            }

            // Skip if already resolved to this pending room
            if (resolvedRoomId.current === roomId) {
                console.log('[DEBUG-USEFFECT] Already resolving this pending room, skipping');
                return;
            }

            // Try to resolve the room ID immediately
            const targetId = roomId.replace('pending:', '');
            console.log('[DEBUG-USEFFECT] Resolving pending room, targetId:', targetId);

            apiCall<{ data: any }>(`/room/${targetId}/private`, { method: 'POST' })
                .then(res => {
                    console.log('[DEBUG-USEFFECT] Room resolution response:', res);

                    // Handle both array (existing room) and string (new room) response
                    let realRoomId: string | undefined;
                    if (Array.isArray(res.data)) {
                        realRoomId = res.data[0]?.id;  // Room exists - use existing
                        console.log('[DEBUG-USEFFECT] Room exists, id:', realRoomId);
                    } else {
                        realRoomId = res.data;  // New room - use new ID
                        console.log('[DEBUG-USEFFECT] New room created, id:', realRoomId);
                    }

                    if (realRoomId) {
                        console.log('[DEBUG-USEFFECT] Resolving to room:', realRoomId);
                        resetChatState();
                        resolvedRoomId.current = realRoomId;
                        onRoomResolved?.(realRoomId);
                    } else {
                        console.log('[DEBUG-USEFFECT] No room ID returned, waiting for first message');
                        resetChatState();
                        resolvedRoomId.current = roomId;
                    }
                })
                .catch(err => {
                    console.error('[DEBUG-USEFFECT] Failed to resolve room:', err);
                    resetChatState();
                    resolvedRoomId.current = roomId;
                });

            return;
        }

        if (resolvedRoomId.current === roomId) {
            console.log('[DEBUG-USEFFECT] Room SAME, skipping fetch');
            return;
        }

        // Guard: prevent concurrent initialization
        if (isInitializing.current) {
            console.log('[DEBUG-USEFFECT] Already initializing, skipping');
            return;
        }

        if (resolvedRoomId.current !== roomId) {
            // Mark as initializing
            isInitializing.current = true;
            console.log('[DEBUG-USEFFECT] Room changed, will fetch history and connect WS');

            setIsKicked(false);
            resetChatState();

            // Sequential execution: fetch history first, then connect WS
            (async () => {
                try {
                    await fetchChatHistory();
                    connectWs();
                    resolvedRoomId.current = roomId;
                    console.log('[DEBUG-USEFFECT] Room initialization complete');
                } catch (error) {
                    console.error('[DEBUG-USEFFECT] Room initialization failed:', error);
                } finally {
                    isInitializing.current = false;
                }
            })();
        } else {
            console.log('[DEBUG-USEFFECT] Room SAME, skipping fetch');
        }

        if (isPrivateRef.current) {
            fetchRoomMembers();
            fetchPartnerInfo();
        }

        return () => {
            isInitializing.current = false;
            if (ws.current) {
                ws.current.onmessage = null;
                ws.current.close();
                ws.current = null;
            }
        };
    }, [roomId, isPendingRoom]); // Using refs for stable values - only trigger on roomId/isPendingRoom change


    const fetchCounts = async () => {
        if (!roomId || isPrivate) return;
        try {
            const [activeRes, totalRes] = await Promise.all([
                apiCall<{ data: number }>(`/room/${roomId}/active-members-count`, { method: 'GET' }),
                apiCall<{ data: number }>(`/room/${roomId}/all-members-count`, { method: 'GET' }),
            ]);
            setActiveMemberCount(activeRes.data);
            setTotalMemberCount(totalRes.data);
        } catch (e) {
            console.error('Failed to fetch counts', e);
        }
    };

    const handleStartCall = useCallback((withVideo: boolean) => {
        const partner = roomMembers.find(m => m.user_id !== user?.id);
        if (!partner) return;

        window.dispatchEvent(new CustomEvent('initiate-call', {
            detail: {
                roomId,
                partnerId: partner.user_id,
                partnerName: roomName,
                partnerPicture: roomPicture,
                withVideo,
            }
        }));
    }, [roomMembers, user?.id, roomId, roomName, roomPicture]);

    useEffect(() => {
        fetchCounts();
    }, [roomId, isPrivate, setActiveMemberCount, setTotalMemberCount]);

    useEffect(() => {
        if (!roomId || isPendingRoom) return;
        const markAsRead = async () => {
            try {
                const settings = useSettingsStore.getState();
                const isActive = useDashboardStore.getState().selectedRoom?.id === roomId ||
                    useDashboardStore.getState().dmRoom?.id === roomId;

                if (settings.read_receipts && isActive) {
                    await apiCall(`/room/${roomId}/read`, { method: 'PUT' });
                }
                updateRoom(roomId, { unread_message: 0 });
            } catch (e) {
                console.error('Failed to mark as read', e);
            }
        };
        markAsRead();
    }, [roomId]);

    const handleRoomAction = async (action: 'leave' | 'kick' | 'admin' | 'demote' | 'delete') => {
        setActionLoading(true);
        try {
            if (action === 'leave') {
                await apiCall(`/room/${roomId}/leave`, { method: 'DELETE' });
                showToast('Successfully left the room!');

                const { rooms, setRooms, allRooms, setAllRooms } = useDashboardStore.getState();
                setRooms(rooms.filter(r => r.id !== roomId));
                setAllRooms(allRooms.filter(r => r.id !== roomId));
                onBack?.();

            } else if (action === 'kick') {
                const currentTargetUserId = useChatStore.getState().targetUserId;
                if (currentTargetUserId === null) return showToast('Please select a user to kick.', 'error');
                await apiCall(`/room/${roomId}/kick?user_id=${currentTargetUserId}`, { method: 'DELETE' });
                showToast('User kicked successfully!');
                setTargetUserId(null);
                await Promise.all([
                    fetchRoomMembers(),
                    fetchCounts()
                ]);

            } else if (action === 'admin') {
                const currentTargetUserId = useChatStore.getState().targetUserId;
                if (currentTargetUserId === null) return showToast('Please select a user to make admin.', 'error');
                await apiCall(`/room/${roomId}/to-admin?user_id=${currentTargetUserId}`, { method: 'PUT' });
                showToast('User is now an admin!');
                setTargetUserId(null);
                await fetchRoomMembers();

            } else if (action === 'demote') {
                const currentTargetUserId = useChatStore.getState().targetUserId;
                if (currentTargetUserId === null) return showToast('Please select a user to remove admin.', 'error');
                await apiCall(`/room/${roomId}/remove-admin?user_id=${currentTargetUserId}`, { method: 'PUT' });
                showToast('Admin removed successfully!');
                setTargetUserId(null);
                await fetchRoomMembers();

            } else if (action === 'delete') {
                await apiCall(`/room/${roomId}`, { method: 'DELETE' });
                showToast('Room deleted successfully!');

                const { rooms, setRooms, allRooms, setAllRooms } = useDashboardStore.getState();
                setRooms(rooms.filter(r => r.id !== roomId));
                setAllRooms(allRooms.filter(r => r.id !== roomId));
                onBack?.();
            }

        } catch (error: any) {
            alert(`Action failed: ${error.message}`);
        } finally {
            setActionLoading(false);
            setShowInfoModal(false);
        }
    };

    const handleUpdateRoom = async (field: 'name' | 'description' | 'picture', value?: string | File) => {
        setEditLoading(true);
        try {
            const formData = new FormData();
            if (field === 'name') formData.append('name', value as string);
            if (field === 'description') formData.append('description', value as string);
            if (field === 'picture') formData.append('picture', value as File);

            await apiCall(`/room/${roomId}`, { method: 'PUT', body: formData });

            // Update local state
            if (field === 'name') {
                setRoomDetails(roomDetails ? { ...roomDetails, name: value as string } : roomDetails);
                setEditingName(false);
                updateRoom(roomId, { name: value as string });
                showToast('Room name updated successfully!');
            }
            if (field === 'description') {
                setRoomDetails(roomDetails ? { ...roomDetails, description: value as string } : roomDetails);
                setEditingDesc(false);
                updateRoom(roomId, { description: value as string });
                showToast('Room description updated successfully!');
            }
            if (field === 'picture') {
                // refetch room details biar gambar baru muncul
                const infoResp = await apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' });
                setRoomDetails(infoResp.data);
                updateRoom(roomId, { picture: infoResp.data.picture });
                showToast('Room picture updated successfully!');
            }
        } catch (e: any) {
            showToast(`Update failed: ${e.message}`, 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const handleOpenInfoModal = async () => {
        setShowInfoModal(true);

        if (isPrivate) {
            // Fetch members untuk ambil info lawan bicara
            setFetchingInfo(true);
            try {
                const resp = await apiCall<{ data: RoomMember[] }>(`/room/${roomId}/members`, { method: 'GET' });
                const members = resp.data || [];
                const partner = members.find(m => m.user_id !== user?.id);
                if (partner) {
                    let socialLinks: SocialLink[] = [];
                    try {
                        const socialResp = await apiCall<{ data: SocialLink[] }>(`/user/social-links/${partner.user_id}`, { method: 'GET' });
                        socialLinks = socialResp.data || [];
                    } catch (socialErr) {
                        console.log("No social links found for user");
                    }

                    setPrivatePartner({
                        user_id: partner.user_id,
                        username: partner.username,
                        user_profile_picture: partner.user_profile_picture,
                        user_bio: partner.user_bio,
                        is_verified: partner.is_verified,
                        created_at: partner.created_at,
                        social_links: socialLinks,
                    });

                    // Fetch mutual rooms
                    const mutualResp = await apiCall<{ data: { id: string; name: string; picture?: string }[] }>(
                        `/room/${partner.user_id}/mutual`, { method: 'GET' }
                    );
                    setMutualRooms(mutualResp.data || []);
                }
            } catch (e) {
                console.error("Failed to fetch partner info", e);
            } finally {
                setFetchingInfo(false);
            }

            return; // stop di sini, tidak fetch room detail
        }

        // Group room
        setFetchingInfo(true);
        setFetchingMembers(true);
        try {
            const [infoResp, friendsResp, activeRes] = await Promise.all([
                apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' }),
                apiCall<{ data: UserProfile[] }>(`/user/list-friend`, { method: 'GET' }),
                apiCall<{ data: number[] }>(`/room/${roomId}/active-members`, { method: 'GET' }),
                fetchRoomMembers(),
            ]);
            setRoomDetails(infoResp.data);
            setFriendsList(friendsResp.data || []);
            setActiveMembers(activeRes.data || []);
        } catch (e) {
            console.error("Failed to fetch room info", e);
        } finally {
            setFetchingInfo(false);
            setFetchingMembers(false);
        }
    };

    const fetchRoomMembers = async () => {
        try {
            const resp = await apiCall<{ data: RoomMember[] }>(`/room/${roomId}/members`, { method: 'GET' });
            setRoomMembers(resp.data || []);
        } catch (e) {
            console.error("Failed to fetch members", e);
        }
    };

    const handleAddMember = async (userId: number) => {
        const { setAddingMember } = useChatStore.getState();
        setAddingMember(true);
        try {
            await apiCall(`/room/${roomId}/add-member?target_id=${userId}`, {
                method: 'POST',
            });
            showToast('Member added successfully!');
            await Promise.all([
                fetchRoomMembers(),
                fetchCounts()
            ]);
        } catch (e: any) {
            showToast(`Failed to add member: ${e.message}`, 'error');
        } finally {
            setAddingMember(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-[var(--bg-primary)] overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 min-w-0">
                <ChatHeader
                    roomId={roomId}
                    roomName={roomName}
                    roomPicture={roomPicture}
                    roomType={roomType}
                    onBack={onBack}
                    onOpenInfoModal={handleOpenInfoModal}
                    onStartCall={handleStartCall}
                    onlineUserIds={onlineUserIds}
                />

                <MessageList
                    messagesEndRef={messagesEndRef}
                    messagesContainerRef={messagesContainerRef}
                    onScroll={handleScroll}
                    onRetry={retryMessage}
                    isPrivate={isPrivate}
                    onReply={(msg) => {
                        setReplyTo(msg);
                        setTimeout(() => messageInputRef.current?.focus(), 0);
                    }}
                />

                {isKicked ? (
                    <div className="px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <span>You've been removed from this room.</span>
                        </div>
                        <button
                            onClick={onBack}
                            className="px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                ) : (
                    <MessageInput
                        roomId={roomId}
                        socket={ws.current}
                        sendMessage={sendMessage}
                        onSendSticker={sendSticker}
                        onSendImage={sendImage}
                    />
                )}
            </div>

            {/* RIGHT SIDEBAR (replaces Info Modal) */}
            {showInfoModal && (
                <RoomInfoSidebar
                    roomId={roomId}
                    roomName={roomName}
                    roomPicture={roomPicture}
                    isAdmin={isAdmin}
                    pictureInputRef={pictureInputRef}
                    handleUpdateRoom={handleUpdateRoom}
                    handleRoomAction={handleRoomAction}
                    onClose={() => setShowInfoModal(false)}
                    onAddMember={handleAddMember}
                    onRefresh={async () => {
                        const [infoResp, activeRes, totalRes] = await Promise.all([
                            apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' }),
                            apiCall<{ data: number[] }>(`/room/${roomId}/active-members`, { method: 'GET' }),
                            apiCall<{ data: number }>(`/room/${roomId}/all-members-count`, { method: 'GET' }),
                            fetchRoomMembers(),
                        ]);
                        setRoomDetails(infoResp.data);
                        setActiveMembers(activeRes.data || []);
                        setActiveMemberCount(activeRes.data?.length ?? 0);
                        setTotalMemberCount(totalRes.data);
                    }}
                    roomType={roomType}
                    onlineUserIds={onlineUserIds}
                    onOpenDM={onOpenDM}
                />
            )}

            {/* PREVIEW PICTURE MODAL */}
            <PreviewPictureModal
                handleUpdateRoom={handleUpdateRoom}
            />

            {/* MEMBERS MODAL */}
            {showUsersModal && (
                <MembersModal
                    isAdmin={isAdmin}
                    onClose={() => { setShowUsersModal(false); setTargetUserId(null); }}
                    handleRoomAction={handleRoomAction}
                />
            )}
        </div>
    );
}
