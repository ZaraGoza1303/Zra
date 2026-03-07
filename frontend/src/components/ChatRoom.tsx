// src/components/ChatRoom.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    Send, Users, ArrowLeft, LogOut, ShieldAlert,
    UserMinus, MoreVertical, Video, Phone, MoreHorizontal,
    Smile, Plus, X, Pencil, User,
    Bell, Star, AlertTriangle, UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getUserImageUrl } from '../services/api';
import { BACKEND_URL } from '../config';
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
                {/* HEADER */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#0d1117] border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={handleOpenInfoModal}
                        >
                            {roomPicture ? (
                                <img src={roomPicture} alt={roomName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#1c2128] border border-white/10 flex items-center justify-center text-[#8b949e]">
                                    {isPrivate ? <User size={18} /> : <Users size={18} />}
                                </div>
                            )}
                            <div>
                                <h3 className="text-[15px] font-semibold text-[#e6edf3] leading-tight group-hover:text-blue-400 transition-colors">
                                    {roomName}
                                </h3>
                                <p className="text-[12px] text-[#8b949e] leading-tight mt-0.5">
                                    {isPrivate
                                        ? 'Direct Message'
                                        : totalMemberCount !== null
                                            ? `${totalMemberCount} members • ${activeMemberCount ?? '?'} online`
                                            : 'Click to view info'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                            title="Video Call"
                        >
                            <Video size={18} />
                        </button>
                        <button
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                            title="Voice Call"
                        >
                            <Phone size={18} />
                        </button>
                        {!isPrivate && (
                            <button
                                onClick={handleOpenUsersModal}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                                title="Members"
                            >
                                <Users size={18} />
                            </button>
                        )}
                        {!isPrivate && (
                            <button
                                onClick={handleOpenInfoModal}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                                title="More"
                            >
                                <MoreHorizontal size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* MESSAGES AREA */}
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                    {fetchingHistory ? (
                        <div className="m-auto flex flex-col items-center gap-3 text-[#8b949e]">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading messages...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="m-auto text-[#8b949e] text-sm text-center">
                            <p>No messages yet.</p>
                            <p className="text-xs mt-1 opacity-70">Start the conversation! 👋</p>
                        </div>
                    ) : (
                        renderMessages()
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT BAR */}
                <div className="px-5 py-4 bg-[#0d1117] shrink-0">
                    <form onSubmit={sendMessage} className="flex items-center gap-3">
                        <button
                            type="button"
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1c2128] border border-white/10 text-[#8b949e] hover:text-[#e6edf3] hover:border-white/20 transition-all shrink-0"
                        >
                            <Plus size={18} />
                        </button>

                        <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#1c2128] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="flex-1 bg-transparent border-none text-[15px] text-[#e6edf3] placeholder-[#8b949e] outline-none"
                            />
                            <button
                                type="button"
                                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors shrink-0"
                            >
                                <Smile size={20} />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-lg shadow-blue-600/30 shrink-0"
                        >
                            <Send size={18} className="translate-x-[1px]" />
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDEBAR (replaces Info Modal) */}
            {showInfoModal && (
                <div className="w-[340px] shrink-0 bg-[#161b22] border-l border-[#21262d] flex flex-col h-full overflow-y-auto">
                    <div className="flex items-center justify-between p-5 border-b border-[#21262d] shrink-0">
                        <h2 className="text-[15px] font-semibold text-[#e6edf3]">{isPrivate ? 'User Info' : 'Group Info'}</h2>
                        <button
                            onClick={() => setShowInfoModal(false)}
                            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {isPrivate ? (
                        <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-[#21262d] shrink-0 gap-3">
                            {fetchingInfo ? (
                                <div className="flex items-center gap-2 text-[#8b949e] text-sm py-4">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : privatePartner ? (
                                <>
                                    <div className="w-[100px] h-[100px] rounded-3xl bg-[#2a3441] flex items-center justify-center overflow-hidden shadow-xl mb-2">
                                        {privatePartner.user_profile_picture ? (
                                            <img src={getUserImageUrl(privatePartner.user_profile_picture)} alt={privatePartner.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={40} className="text-[#8b949e]" />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-xl font-bold text-[#e6edf3]">{privatePartner.username}</h2>
                                        <p className="text-[13px] text-[#8b949e] mt-1">@{privatePartner.username}</p>
                                    </div>
                                    {privatePartner.user_bio && (
                                        <div className="w-full mt-6 bg-[#0d1117] p-4 rounded-xl border border-white/5">
                                            <p className="text-[11px] font-bold text-[#8b949e] tracking-widest uppercase mb-3 text-left">Bio</p>
                                            <p className="text-[14px] text-[#cdd9f0] leading-relaxed text-left">
                                                {privatePartner.user_bio}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-[#8b949e] py-4 text-center">Failed to load profile.</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-[#21262d] shrink-0">
                                {/* Avatar dengan edit button */}
                                <div className="relative w-[104px] h-[104px] group/avatar mb-4">
                                    <div className="w-full h-full rounded-[28px] bg-[#2a3441] flex items-center justify-center overflow-hidden shadow-xl border border-white/5">
                                        {roomPicture ? (
                                            <img src={roomPicture} alt={roomName} className="w-full h-full object-cover" />
                                        ) : (
                                            <Users size={40} className="text-[#8b949e]" />
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => pictureInputRef.current?.click()}
                                                className="absolute inset-0 rounded-[28px] bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                            >
                                                <Pencil size={20} className="text-white" />
                                            </button>
                                            <input
                                                type="file"
                                                ref={pictureInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setPreviewPicture({ file, url: URL.createObjectURL(file) });
                                                    }
                                                }}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Name dengan edit button */}
                                {editingName ? (
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <input
                                            autoFocus
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="bg-[#0d1117] border border-blue-500/50 rounded-lg px-3 py-1.5 text-[#e6edf3] text-[15px] font-bold outline-none"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleUpdateRoom('name', editName);
                                                if (e.key === 'Escape') setEditingName(false);
                                            }}
                                        />
                                        <button
                                            onClick={() => handleUpdateRoom('name', editName)}
                                            disabled={editLoading}
                                            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                                        >
                                            {editLoading ? '...' : 'Save'}
                                        </button>
                                        <button onClick={() => setEditingName(false)} className="text-[#8b949e] hover:text-[#e6edf3]">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h2 className="text-[19px] font-bold text-[#e6edf3]">{roomDetails?.name || roomName}</h2>
                                        {isAdmin && (
                                            <button
                                                onClick={() => { setEditName(roomDetails?.name || roomName); setEditingName(true); }}
                                                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <p className="text-[13px] text-[#8b949e]">
                                    {totalMemberCount !== null
                                        ? `${totalMemberCount} members • ${activeMemberCount ?? 0} online`
                                        : 'Loading...'}
                                </p>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase">Description</h3>
                                    {isAdmin && !editingDesc && (
                                        <button
                                            onClick={() => { setEditDesc(roomDetails?.description || ''); setEditingDesc(true); }}
                                            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                </div>
                                {editingDesc ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            autoFocus
                                            value={editDesc}
                                            onChange={e => setEditDesc(e.target.value)}
                                            rows={3}
                                            className="bg-[#0d1117] border border-blue-500/50 rounded-lg px-3 py-2 text-[#e6edf3] text-[14px] outline-none resize-none font-[inherit]"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateRoom('description', editDesc)}
                                                disabled={editLoading}
                                                className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                            >
                                                {editLoading ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => setEditingDesc(false)}
                                                className="flex-1 py-1.5 rounded-lg text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[14px] text-[#cdd9f0] leading-relaxed">
                                        {roomDetails?.description || <span className="text-[#8b949e] italic">No description yet.</span>}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase">Members</h3>
                                    <span className="bg-[#21262d] text-[#8b949e] text-[11px] px-2.5 py-0.5 rounded-md font-medium">{roomMembers.length}</span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {fetchingMembers ? (
                                        <div className="flex justify-center text-[#8b949e]">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : roomMembers.map(member => {
                                        const isOnline = member.user_id === user?.id; // Stub logic to match design slightly
                                        return (
                                            <div key={member.user_id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="relative">
                                                        <div className="w-[42px] h-[42px] rounded-full overflow-hidden">
                                                            {member.user_profile_picture ? (
                                                                <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-[#2a3441] flex items-center justify-center text-[#cdd9f0] font-bold text-[15px]">
                                                                    {member.username?.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`absolute bottom-0 right-0 w-[12px] h-[12px] rounded-full border-[2.5px] border-[#161b22] ${isOnline ? 'bg-green-500' : 'bg-[#4b5563]'}`}></div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[15px] font-medium text-[#e6edf3] leading-tight mb-0.5">
                                                            {member.username}
                                                        </span>
                                                        <span className={`text-[12px] ${isOnline ? 'text-green-500' : 'text-[#8b949e]'}`}>
                                                            {isOnline ? 'Online' : 'Offline'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {member.role === 'admin' && (
                                                    <span className="text-[11px] text-[#8b949e] bg-[#21262d] px-2 py-1 rounded-[6px] font-medium">Admin</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button className="mt-6 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-[#8b949e] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/5 hover:text-[#e6edf3] hover:border-white/30 transition-all">
                                    <UserPlus size={18} /> Add Member
                                </button>
                            </div>

                            <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase">Shared Media</h3>
                                    <button className="text-blue-500 text-[12px] hover:text-blue-400 font-medium">View All</button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 aspect-square rounded-[14px] bg-[#eef5ef] bg-opacity-5 flex items-center justify-center overflow-hidden border border-white/5 p-2">
                                        <div className="w-full h-full relative">
                                            <div className="absolute top-2 left-2 w-3 h-3 bg-[#4b7a63] rounded-full"></div>
                                            <div className="absolute bottom-2 left-4 w-4 h-4 bg-[#7ab89b] rounded-full blur-[1px]"></div>
                                            <div className="absolute top-4 right-2 w-5 h-5 bg-[#2c4e3f] rounded-full"></div>
                                            <div className="absolute top-3 left-3 w-10 h-[1px] bg-[#4b7a63] rotate-45 origin-left"></div>
                                            <div className="absolute top-5 right-4 w-6 h-[1px] bg-[#7ab89b] -rotate-45 origin-left"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 aspect-square rounded-[14px] bg-[#455c56] bg-opacity-20 flex items-center justify-center overflow-hidden border border-white/5 p-2">
                                        <div className="w-full h-full relative opacity-70">
                                            <div className="absolute top-1 left-3 w-4 h-4 bg-[#6e9a8f] rounded-full"></div>
                                            <div className="absolute bottom-3 right-2 w-3 h-3 bg-[#94c3b7] rounded-full"></div>
                                            <div className="absolute bottom-1 left-2 w-2 h-2 bg-[#4b6d64] rounded-full"></div>
                                            <div className="absolute top-2 left-4 w-8 h-[1px] bg-[#6e9a8f] rounded-full origin-left rotate-[30deg]"></div>
                                            <div className="absolute bottom-3 right-3 w-6 h-[1px] bg-[#94c3b7] rounded-full origin-left -rotate-[40deg]"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 aspect-square rounded-[14px] bg-[#21262d] flex items-center justify-center text-[#8b949e] text-[13px] font-medium border border-white/5 hover:bg-[#2a3038] cursor-pointer transition-colors">
                                        +12
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col p-6 shrink-0">
                                <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase mb-5">Settings</h3>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
                                        <div className="flex items-center gap-3.5 text-[#e6edf3] text-[14px] font-medium">
                                            <Bell size={18} className="text-[#8b949e]" /> Mute Notifications
                                        </div>
                                        <div className="w-[36px] h-[20px] bg-[#2a3038] rounded-full relative cursor-pointer border border-white/5">
                                            <div className="w-[14px] h-[14px] bg-[#8b949e] rounded-full absolute top-[2px] left-[2px] shadow-sm"></div>
                                        </div>
                                    </div>
                                    <button className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#e6edf3] text-[14px] font-medium hover:bg-white/5 transition-all">
                                        <Star size={18} className="text-[#8b949e]" /> Add to Favorites
                                    </button>
                                    <button className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all mt-1">
                                        <AlertTriangle size={18} /> Report Group
                                    </button>
                                    <button onClick={() => handleRoomAction('leave')} disabled={actionLoading} className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all disabled:opacity-50">
                                        <LogOut size={18} /> Leave Group
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* PREVIEW PICTURE MODAL */}
            {previewPicture && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    onClick={() => setPreviewPicture(null)}
                >
                    <div
                        className="w-full max-w-[360px] bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <h3 className="text-sm font-semibold text-[#e6edf3]">Change Group Photo</h3>
                            <button
                                onClick={() => setPreviewPicture(null)}
                                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-4 p-6">
                            <div className="w-32 h-32 rounded-[28px] overflow-hidden border border-white/10 shadow-xl">
                                <img src={previewPicture.url} alt="preview" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-xs text-[#8b949e] text-center">
                                This will be the new group photo. Are you sure?
                            </p>
                        </div>

                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={() => {
                                    URL.revokeObjectURL(previewPicture.url);
                                    setPreviewPicture(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await handleUpdateRoom('picture', previewPicture.file);
                                    URL.revokeObjectURL(previewPicture.url);
                                    setPreviewPicture(null);
                                }}
                                disabled={editLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {editLoading ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MEMBERS MODAL (Keeping the old one exactly as it was, just in case they click the users icon) */}
            {showUsersModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowUsersModal(false)}
                >
                    <div
                        className="w-full max-w-[380px] bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                            <div>
                                <h2 className="text-base font-semibold text-[#e6edf3]">Members</h2>
                                <p className="text-xs text-[#8b949e] mt-0.5">{roomMembers.length} people in this room</p>
                            </div>
                            <button
                                onClick={() => { setShowUsersModal(false); setTargetUserId(null); }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Member List */}
                        <div className="flex-1 overflow-y-auto p-3">
                            {fetchingMembers ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-[#8b949e]">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            ) : roomMembers.length > 0 ? (
                                roomMembers.map(member => (
                                    <div
                                        key={member.user_id}
                                        onClick={() => member.user_id !== user?.id && setTargetUserId(member.user_id)}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all mb-0.5
                                            ${targetUserId === member.user_id
                                                ? 'bg-blue-600/15 border border-blue-600/20'
                                                : member.user_id !== user?.id ? 'hover:bg-white/4 border border-transparent' : 'border border-transparent opacity-70 cursor-default'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                                            {member.user_profile_picture ? (
                                                <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {member.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium text-[#e6edf3] truncate">
                                                    {member.username}
                                                </span>
                                                {member.user_id === user?.id && (
                                                    <span className="text-[10px] text-[#8b949e] font-normal">(You)</span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block font-medium
                                                ${member.role === 'admin'
                                                    ? 'bg-yellow-500/15 text-yellow-400'
                                                    : 'bg-blue-500/15 text-blue-400'
                                                }`}
                                            >
                                                {member.role}
                                            </span>
                                        </div>
                                        {member.role !== 'admin' && member.user_id !== user?.id && isAdmin && (
                                            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors">
                                                <MoreVertical size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[#8b949e] text-sm">No members found.</div>
                            )}
                        </div>

                        {/* Admin Actions */}
                        {isAdmin && (
                            <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
                                <button
                                    onClick={() => handleRoomAction('kick')}
                                    disabled={actionLoading || targetUserId === null || targetUserId === user?.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <UserMinus size={14} /> Kick
                                </button>
                                <button
                                    onClick={() => handleRoomAction('admin')}
                                    disabled={actionLoading || targetUserId === null || targetUserId === user?.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ShieldAlert size={14} /> Make Admin
                                </button>
                            </div>
                        )}

                        <div className="p-4 pt-0" hidden={isAdmin}>
                            <button
                                onClick={() => { setShowUsersModal(false); setTargetUserId(null); }}
                                className="w-full py-2.5 rounded-xl text-sm font-medium text-[#e6edf3] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
