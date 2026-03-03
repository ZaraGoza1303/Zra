// src/components/ChatRoom.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    Send, Users, ArrowLeft, LogOut, ShieldAlert,
    UserMinus, MoreVertical, Video, Phone, MoreHorizontal,
    Smile, Plus, X, Pencil
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getUserImageUrl } from '../services/api';
import { BACKEND_URL } from '../config';
import type { Message, ChatRoomProps, RoomMember, RoomResponse } from '../types/chat';

export default function ChatRoom({ roomId, roomName, roomPicture, onBack }: ChatRoomProps) {
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
    const [fetchingMembers, setFetchingMembers] = useState(false);

    const [roomDetails, setRoomDetails] = useState<RoomResponse | null>(null);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);

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
                    setMessages((prev) => [...prev, msg]);
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

    const handleOpenInfoModal = async () => {
        setShowInfoModal(true);
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

            if (!isSystem && msg.timestamp) {
                const label = getDateLabel(msg.timestamp);
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
                    {!isMe && (
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-1">
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                {msg.username?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}

                    <div className={`flex flex-col max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
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
                        {msg.timestamp && (
                            <span className="text-[10px] text-[#8b949e] mt-1 mx-1">
                                {formatMsgTime(msg.timestamp)}
                            </span>
                        )}
                    </div>
                </div>
            );
        });

        return elements;
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0d1117]">
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
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-base">
                                {roomName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="text-sm font-semibold text-[#e6edf3] leading-tight group-hover:text-blue-400 transition-colors">
                                {roomName}
                            </h3>
                            <p className="text-[11px] text-[#8b949e] leading-tight">
                                {roomMembers.length > 0
                                    ? `${roomMembers.length} members • ${roomMembers.length} online`
                                    : 'Click to view info'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
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
                    <button
                        onClick={handleOpenUsersModal}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                        title="Members"
                    >
                        <Users size={18} />
                    </button>
                    <button
                        onClick={handleOpenInfoModal}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                        title="More"
                    >
                        <MoreHorizontal size={18} />
                    </button>
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
            <div className="px-5 py-4 bg-[#0d1117] border-t border-white/5 shrink-0">
                <form onSubmit={sendMessage} className="flex items-center gap-3">
                    <button
                        type="button"
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1c2128] border border-white/10 text-[#8b949e] hover:text-[#e6edf3] hover:border-white/20 transition-all shrink-0"
                    >
                        <Plus size={16} />
                    </button>

                    <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-[#1c2128] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none"
                        />
                        <button
                            type="button"
                            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors shrink-0"
                        >
                            <Smile size={18} />
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-lg shadow-blue-600/30 shrink-0"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>

            {/* INFO MODAL */}
            {showInfoModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowInfoModal(false)}
                >
                    <div
                        className="w-full max-w-[380px] bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header Bar */}
                        <div className="flex justify-end p-4 border-b border-white/5">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Room Icon & Info */}
                        <div className="px-6 pb-5">
                            <div className="w-16 h-16 rounded-2xl bg-[#1c2128] border border-white/5 flex items-center justify-center mb-4">
                                {roomPicture ? (
                                    <img src={roomPicture} alt={roomName} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <Users size={28} className="text-[#8b949e]" />
                                )}
                            </div>

                            {fetchingInfo ? (
                                <div className="flex items-center gap-2 text-[#8b949e] text-sm py-4">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    Loading...
                                </div>
                            ) : roomDetails ? (
                                <>
                                    <div className="flex items-start justify-between mb-1">
                                        <h2 className="text-lg font-bold text-[#e6edf3]">{roomDetails.name}</h2>
                                        <button className="text-[#8b949e] hover:text-[#e6edf3] transition-colors mt-0.5">
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-[#8b949e] mb-4">
                                        Created on {new Date(roomDetails.created_at || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>

                                    {roomDetails.description && (
                                        <div className="mb-4">
                                            <p className="text-[10px] font-semibold tracking-widest text-[#8b949e] uppercase mb-2">Description</p>
                                            <p className="text-sm text-[#cdd9f0] leading-relaxed">{roomDetails.description}</p>
                                        </div>
                                    )}

                                    {roomDetails.room_link && (
                                        <div className="mb-4">
                                            <p className="text-[10px] font-semibold tracking-widest text-[#8b949e] uppercase mb-2">Room Link</p>
                                            <code className="text-xs bg-[#0d1117] border border-white/5 px-3 py-2 rounded-lg block break-all text-blue-400">
                                                {roomDetails.room_link}
                                            </code>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-[#8b949e] py-4">Failed to load room details.</p>
                            )}
                        </div>

                        {/* Members Section */}
                        {roomDetails && (
                            <div className="px-6 pb-4 border-t border-white/5 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-semibold tracking-widest text-[#8b949e] uppercase">
                                        Members ({roomMembers.length || '—'})
                                    </p>
                                </div>
                                {roomMembers.length > 0 ? (
                                    <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                                        {roomMembers.map(member => (
                                            <div key={member.user_id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-white/3 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                                        {member.user_profile_picture ? (
                                                            <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                                                {member.username?.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-[#e6edf3] font-medium truncate max-w-[160px]">
                                                        {member.user_id === user?.id ? 'You' : member.username}
                                                    </span>
                                                </div>
                                                <button className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                                                    <MoreVertical size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : fetchingMembers ? (
                                    <div className="flex items-center gap-2 text-[#8b949e] text-xs py-2">
                                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        Loading members...
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#8b949e] py-1">No members found.</p>
                                )}
                            </div>
                        )}

                        {/* Leave Room Button */}
                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => handleRoomAction('leave')}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <LogOut size={16} />
                                Leave Room
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MEMBERS MODAL */}
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