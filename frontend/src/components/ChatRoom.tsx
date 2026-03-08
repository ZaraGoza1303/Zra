// src/components/ChatRoom.tsx
import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { apiCall } from '../services/api';
import { BACKEND_URL } from '../config';
import ChatHeader from './chatroom/ChatHeader';
import MessageList from './chatroom/MessageList';
import MessageInput from './chatroom/MessageInput';
import RoomInfoSidebar from './chatroom/RoomInfoSidebar';
import PreviewPictureModal from './chatroom/PreviewPictureModal';
import MembersModal from './chatroom/MembersModal';
import type { Message, ChatRoomProps, RoomMember, RoomResponse, UserProfile } from '../types/chat';

export default function ChatRoom({ roomId, roomName, roomPicture, roomType, onBack, onNewMessage }: ChatRoomProps) {
    const isPrivate = roomType === 'private';
    const { user, token } = useAuthStore();
    const {
        messages, setMessages,
        input, setInput,
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
        targetUserId, setTargetUserId,
        setActionLoading,
        setPrivatePartner,
        setEditingName,
        setEditingDesc,
        setEditLoading,
        resetChatState
    } = useChatStore();

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pictureInputRef = useRef<HTMLInputElement>(null);

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

    const fetchChatHistory = async (lastTimestamp?: string) => {
        if (lastTimestamp) {
            setLoadingMore(true);
        } else {
            setFetchingHistory(true);
        }
        try {
            const url = lastTimestamp
                ? `/room/${roomId}/history?limit=20&last_timestamp=${encodeURIComponent(lastTimestamp)}`
                : `/room/${roomId}/history?limit=20`;

            const resp = await apiCall<{ data: Message[] }>(url, { method: 'GET' });
            const newMessages = resp.data || [];

            if (lastTimestamp) {
                setMessages(prev => [...newMessages, ...prev]); // prepend
            } else {
                setMessages(newMessages);
            }

            setHasMore(newMessages.length === 20); // kalau kurang dari limit, berarti sudah habis
        } catch (e) {
            console.error("Failed to fetch chat history", e);
        } finally {
            setFetchingHistory(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!roomId || !user || !token) return;

        // Reset state saat ganti room
        resetChatState();

        const connectWs = () => {
            const wsBaseUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
            const wsUrl = `${wsBaseUrl}/ws/${roomId}?token=${token}`;
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('Connected to WS', roomId);
            };

            ws.current.onmessage = (event) => {
                try {
                    const msg: Message = JSON.parse(event.data);
                    console.log('msg.timestamp:', msg.time_stamp);
                    setMessages((prev) => [...prev, msg]);

                    if (msg.type !== 'join' && msg.type !== 'leave' && msg.type !== 'system') {
                        onNewMessage?.(roomId, {
                            content: msg.content,
                            username: msg.username,
                            sent_at: msg.time_stamp,
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
        };

        fetchChatHistory();
        connectWs();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [roomId, user, token, resetChatState]);


    useEffect(() => {
        if (!roomId || isPrivate) return;
        const fetchCounts = async () => {
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
        fetchCounts();
    }, [roomId, isPrivate, setActiveMemberCount, setTotalMemberCount]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !ws.current) return;

        const payload = {
            content: input,
        };

        ws.current.send(JSON.stringify(payload));
        setInput('');
    };

    const handleRoomAction = async (action: 'leave' | 'kick' | 'admin') => {
        setActionLoading(true);
        try {
            if (action === 'leave') {
                await apiCall(`/room/${roomId}/leave`, { method: 'DELETE' });
                alert('Successfully left the room!');
                onBack?.();
            } else if (action === 'kick') {
                if (targetUserId === null) return alert('Please select a user to kick.');
                await apiCall(`/room/${roomId}/kick?user_id=${targetUserId}`, { method: 'DELETE' });
                alert('User kicked successfully!');
                setTargetUserId(null);
                await fetchRoomMembers();
            } else if (action === 'admin') {
                if (targetUserId === null) return alert('Please select a user to make admin.');
                await apiCall(`/room/${roomId}/to-admin?user_id=${targetUserId}`, { method: 'PUT' });
                alert('User is now an admin!');
                setTargetUserId(null);
                await fetchRoomMembers();
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
            }
            if (field === 'description') {
                setRoomDetails(roomDetails ? { ...roomDetails, description: value as string } : roomDetails);
                setEditingDesc(false);
            }
            if (field === 'picture') {
                // refetch room details biar gambar baru muncul
                const infoResp = await apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' });
                setRoomDetails(infoResp.data);
            }
        } catch (e: any) {
            alert(`Update failed: ${e.message}`);
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
                if (partner) setPrivatePartner(partner);
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
            const [infoResp, friendsResp] = await Promise.all([
                apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' }),
                apiCall<{ data: UserProfile[] }>(`/user/list-friend`, { method: 'GET' }),
                fetchRoomMembers(),
            ]);
            setRoomDetails(infoResp.data);
            setFriendsList(friendsResp.data || []);
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

    const handleOpenUsersModal = async () => {
        setShowUsersModal(true);
        setFetchingMembers(true);
        await fetchRoomMembers();
        setFetchingMembers(false);
    };

    const handleAddMember = async (userId: number) => {
        const { setAddingMember } = useChatStore.getState();
        setAddingMember(true);
        try {
            await apiCall(`/room/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            await fetchRoomMembers();
        } catch (e: any) {
            alert(`Failed to add member: ${e.message}`);
        } finally {
            setAddingMember(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-[#0d1117] overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 min-w-0">
                <ChatHeader
                    roomId={roomId}
                    roomName={roomName}
                    roomPicture={roomPicture}
                    onBack={onBack}
                    onOpenInfoModal={handleOpenInfoModal}
                    onOpenUsersModal={handleOpenUsersModal}
                />

                <MessageList
                    messagesEndRef={messagesEndRef}
                    messagesContainerRef={messagesContainerRef}
                    onScroll={handleScroll}
                />

                <MessageInput
                    sendMessage={sendMessage}
                />
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
