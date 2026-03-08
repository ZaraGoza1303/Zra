// src/components/ChatRoom.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getUserImageUrl } from '../services/api';
import { BACKEND_URL } from '../config';
import ChatHeader from './chatroom/ChatHeader';
import MessageList from './chatroom/MessageList';
import MessageInput from './chatroom/MessageInput';
import RoomInfoSidebar from './chatroom/RoomInfoSidebar';
import PreviewPictureModal from './chatroom/PreviewPictureModal';
import MembersModal from './chatroom/MembersModal';
import type { Message, ChatRoomProps, RoomMember, RoomResponse } from '../types/chat';

export default function ChatRoom({ roomId, roomName, roomPicture, roomType, onBack, onNewMessage }: ChatRoomProps) {
    const isPrivate = roomType === 'private';
    const { user, token } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [targetUserId, setTargetUserId] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
    const [totalMemberCount, setTotalMemberCount] = useState<number | null>(null);
    const [activeMemberCount, setActiveMemberCount] = useState<number | null>(null);
    const [fetchingMembers, setFetchingMembers] = useState(false);

    const [roomDetails, setRoomDetails] = useState<RoomResponse | null>(null);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    // Edit states
    const [editingName, setEditingName] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const pictureInputRef = useRef<HTMLInputElement>(null);
    const [previewPicture, setPreviewPicture] = useState<{ file: File; url: string } | null>(null);

    const [privatePartner, setPrivatePartner] = useState<{
        username: string;
        name?: string;
        user_bio?: string;
        user_profile_picture?: string;
    } | null>(null);

    // Check if current user is admin
    const isAdmin = roomMembers.some(m => m.user_id === user?.id && m.role === 'admin');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!roomId || !user || !token) return;

        const fetchChatHistory = async () => {
            setFetchingHistory(true);
            try {
                const resp = await apiCall<{ data: Message[] }>(`/room/${roomId}/history`, { method: 'GET' });
                setMessages(resp.data || []);
            } catch (e) {
                console.error("Failed to fetch chat history", e);
            } finally {
                setFetchingHistory(false);
            }
        };

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
    }, [roomId, user, token]);


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
    }, [roomId, isPrivate]);

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
                setRoomDetails(prev => prev ? { ...prev, name: value as string } : prev);
                setEditingName(false);
            }
            if (field === 'description') {
                setRoomDetails(prev => prev ? { ...prev, description: value as string } : prev);
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

        // Group room logic yang sudah ada
        setFetchingInfo(true);
        setFetchingMembers(true);
        try {
            const [infoResp] = await Promise.all([
                apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' }),
                fetchRoomMembers(),
            ]);
            setRoomDetails(infoResp.data);
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

    // Group messages by date for date separators
    const getDateLabel = (timestamp: string) => {
        const d = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'TODAY';
        if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    const formatMsgTime = (timestamp: string) => {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // Build message list with date separators
    const renderMessages = () => {
        const elements: React.ReactNode[] = [];
        let lastDateLabel = '';

        messages.forEach((msg, idx) => {
            const isSystem = msg.type === 'join' || msg.type === 'leave' || msg.type === 'system';

            if (!isSystem && msg.time_stamp) {
                const label = getDateLabel(msg.time_stamp);
                if (label !== lastDateLabel) {
                    lastDateLabel = label;
                    elements.push(
                        <div key={`sep-${idx}`} className="flex items-center justify-center my-3">
                            <span className="px-4 py-1 text-[10px] font-semibold tracking-widest text-[#8b949e] bg-[#161b22] rounded-full border border-white/5">
                                {label}
                            </span>
                        </div>
                    );
                }
            }

            if (isSystem) {
                elements.push(
                    <div key={msg.id || idx} className="flex justify-center my-1">
                        <span className="px-4 py-1.5 rounded-full text-xs text-[#8b949e] bg-white/5">
                            {msg.content}
                        </span>
                    </div>
                );
                return;
            }

            const isMe = msg.user_id === user?.id;
            elements.push(
                <div key={msg.id || idx} className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for others */}
                    {!isMe && !isPrivate && (
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-1">
                            {msg.profile_picture ? (
                                <img src={getUserImageUrl(msg.profile_picture)} alt={msg.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                    {msg.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`flex flex-col max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && !isPrivate && (
                            <span className="text-xs text-[#8b949e] font-medium mb-1 ml-1">{msg.username}</span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                            ${isMe
                                ? 'bg-[#1d3a6e] text-[#cdd9f0] rounded-br-sm'
                                : 'bg-[#1c2128] text-[#e6edf3] rounded-bl-sm border border-white/5'
                            }`}
                        >
                            {msg.content}
                        </div>
                        {msg.time_stamp && (
                            <span className="text-[10px] text-[#8b949e] mt-1 mx-1">
                                {formatMsgTime(msg.time_stamp)}
                            </span>
                        )}
                    </div>
                </div>
            );
        });

        return elements;
    };

    return (
        <div className="flex h-full w-full bg-[#0d1117] overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 min-w-0">
                <ChatHeader
                    roomId={roomId}
                    roomName={roomName}
                    roomPicture={roomPicture}
                    isPrivate={isPrivate}
                    totalMemberCount={totalMemberCount}
                    activeMemberCount={activeMemberCount}
                    onBack={onBack}
                    onOpenInfoModal={handleOpenInfoModal}
                    onOpenUsersModal={handleOpenUsersModal}
                />

                <MessageList
                    messages={messages}
                    user={user}
                    isPrivate={isPrivate}
                    fetchingHistory={fetchingHistory}
                    messagesEndRef={messagesEndRef}
                />

                <MessageInput
                    input={input}
                    setInput={setInput}
                    sendMessage={sendMessage}
                />
            </div>

            {/* RIGHT SIDEBAR (replaces Info Modal) */}
            {showInfoModal && (
                <RoomInfoSidebar
                    roomId={roomId}
                    roomName={roomName}
                    roomPicture={roomPicture}
                    isPrivate={isPrivate}
                    fetchingInfo={fetchingInfo}
                    fetchingMembers={fetchingMembers}
                    privatePartner={privatePartner}
                    roomDetails={roomDetails}
                    roomMembers={roomMembers}
                    totalMemberCount={totalMemberCount}
                    activeMemberCount={activeMemberCount}
                    isAdmin={isAdmin}
                    user={user}
                    actionLoading={actionLoading}
                    editingName={editingName}
                    editingDesc={editingDesc}
                    editName={editName}
                    editDesc={editDesc}
                    pictureInputRef={pictureInputRef}
                    setPreviewPicture={setPreviewPicture}
                    setEditingName={setEditingName}
                    setEditingDesc={setEditingDesc}
                    setEditName={setEditName}
                    setEditDesc={setEditDesc}
                    handleUpdateRoom={handleUpdateRoom}
                    handleRoomAction={handleRoomAction}
                    onClose={() => setShowInfoModal(false)}
                    editLoading={editLoading}
                />
            )}

            {/* PREVIEW PICTURE MODAL */}
            <PreviewPictureModal
                previewPicture={previewPicture}
                setPreviewPicture={setPreviewPicture}
                handleUpdateRoom={handleUpdateRoom}
                editLoading={editLoading}
            />

            {/* MEMBERS MODAL */}
            {showUsersModal && (
                <MembersModal
                    roomMembers={roomMembers}
                    user={user}
                    isAdmin={isAdmin}
                    fetchingMembers={fetchingMembers}
                    targetUserId={targetUserId}
                    actionLoading={actionLoading}
                    setTargetUserId={setTargetUserId}
                    onClose={() => { setShowUsersModal(false); setTargetUserId(null); }}
                    handleRoomAction={handleRoomAction}
                />
            )}
        </div>
    );
}
