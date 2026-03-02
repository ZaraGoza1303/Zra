// src/components/ChatRoom.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Send, Users, Info, ArrowLeft, LogOut, ShieldAlert, UserMinus, MoreVertical } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getUserImageUrl } from '../services/api';
import { BACKEND_URL, FRONTEND_JOIN_URL } from '../config';

interface Message {
    id: string;
    room_id: string;
    user_id: number;
    username: string;
    type: string;
    content: string;
    timestamp: string;
}

interface ChatRoomProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    onBack?: () => void;
}

interface RoomMember {
    user_id: number;
    user_profile_picture?: string;
    username: string;
    user_bio?: string;
    role: string;
}

interface RoomResponse {
    id: string;
    owner_id: number;
    picture?: string;
    name: string;
    description?: string;
    room_link: string;
    created_at: string;
    updated_at: string;
}

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

    // Check if current user is admin
    const isAdmin = roomMembers.some(m => m.user_id === user?.id && m.role === 'admin');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!roomId || !user || !token) return;

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
                // Refresh members list
                await fetchRoomMembers();
            } else if (action === 'admin') {
                if (targetUserId === null) return alert('Please select a user to make admin.');
                await apiCall(`/room/${roomId}/to-admin?user_id=${targetUserId}`, { method: 'PUT' });
                alert('User is now an admin!');
                setTargetUserId(null);
                // Refresh members list
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
        try {
            const resp = await apiCall<{ data: RoomResponse }>(`/room/${roomId}`, { method: 'GET' });
            setRoomDetails(resp.data);
        } catch (e) {
            console.error("Failed to fetch room info", e);
        } finally {
            setFetchingInfo(false);
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

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            onClick={onBack}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    {roomPicture ? (
                        <img src={roomPicture} alt={roomName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {roomName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-medium m-0">{roomName}</h3>
                        <span className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            Online
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        onClick={handleOpenInfoModal}
                        title="Room Info"
                    >
                        <Info size={20} />
                    </button>
                    <button
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        onClick={handleOpenUsersModal}
                        title="Members"
                    >
                        <Users size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {messages.length === 0 ? (
                    <div className="m-auto text-gray-400 text-center">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isSystem = msg.type === 'join' || msg.type === 'leave' || msg.type === 'system';

                        if (isSystem) {
                            return (
                                <div key={msg.id || idx} className="w-full flex justify-center my-1">
                                    <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs text-gray-400">
                                        {msg.content}
                                    </span>
                                </div>
                            );
                        }

                        const isMe = msg.user_id === user?.id;
                        return (
                            <div key={msg.id || idx} className={`flex flex-col max-w-full ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && (
                                    <span className="text-xs text-gray-400 mb-1 ml-3">{msg.username}</span>
                                )}
                                <div className={`p-3 max-w-[70%] rounded-2xl shadow-lg break-words ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-white/10 text-gray-200 rounded-bl-md'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/10">
                <form onSubmit={sendMessage} className="flex gap-3">
                    <input
                        type="text"
                        className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:border-blue-600"
                        placeholder="Type your message..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        disabled={!input.trim()}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>

            {/* Info Modal */}
            {showInfoModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center"
                    onClick={() => setShowInfoModal(false)}
                >
                    <div className="w-[90%] max-w-[360px] p-6 max-h-[80vh] flex flex-col bg-white/10 backdrop-blur-lg rounded-xl border border-white/20" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-4">Room Info</h2>

                        {fetchingInfo ? (
                            <div className="text-center py-5 text-gray-400">Loading...</div>
                        ) : roomDetails ? (
                            <div className="mb-6 text-sm flex flex-col gap-2">
                                <div className="flex flex-col gap-1">
                                    <strong className="text-gray-400 text-xs">Name:</strong>
                                    <span>{roomDetails.name}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <strong className="text-gray-400 text-xs">Description:</strong>
                                    <span>{roomDetails.description || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <strong className="text-gray-400 text-xs">Link/Code:</strong>
                                    <span className="font-mono bg-black/20 px-2 py-1 rounded text-xs break-all">
                                        {`${roomDetails.room_link}`}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <strong className="text-gray-400 text-xs">Created:</strong>
                                    <span>{new Date(roomDetails.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-5 text-gray-400">Failed to load room details.</div>
                        )}

                        <div className="flex flex-col gap-3 mt-4">
                            <button
                                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                onClick={() => handleRoomAction('leave')}
                                disabled={actionLoading}
                            >
                                <LogOut size={18} /> Leave Room
                            </button>
                            <button
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                onClick={() => setShowInfoModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Modal */}
            {showUsersModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center"
                    onClick={() => setShowUsersModal(false)}
                >
                    <div className="w-[90%] max-w-[360px] p-6 max-h-[80vh] flex flex-col bg-white/10 backdrop-blur-lg rounded-xl border border-white/20" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold mb-2">Manage Members</h2>
                        <p className="text-sm text-gray-400 mb-4">Select a member to apply admin actions:</p>

                        <div className="flex-1 overflow-y-auto mb-4 border border-white/10 rounded-lg p-2">
                            {fetchingMembers ? (
                                <div className="text-center py-5 text-gray-400">Loading...</div>
                            ) : roomMembers.length > 0 ? (
                                roomMembers.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${targetUserId === member.user_id ? 'bg-blue-600/20 border-l-4 border-blue-600' : 'hover:bg-white/5'
                                            }`}
                                        onClick={() => member.user_id !== user?.id && setTargetUserId(member.user_id)}
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                            {member.user_profile_picture ? (
                                                <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {member.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                                                {member.username}
                                                {member.user_id === user?.id && <span className="text-xs text-gray-400 font-normal">(You)</span>}
                                            </div>
                                            <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block ${member.role === 'admin'
                                                ? 'bg-yellow-500/20 text-yellow-500'
                                                : 'bg-blue-500/20 text-blue-500'
                                                }`}>
                                                {member.role}
                                            </div>
                                        </div>
                                        {member.role !== 'admin' && member.user_id !== user?.id && isAdmin && (
                                            <button className="p-1 opacity-50 hover:opacity-100">
                                                <MoreVertical size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-5 text-gray-400">No members found.</div>
                            )}
                        </div>

                        {/* Admin Actions - Only visible for admins */}
                        {isAdmin && (
                            <div className="flex flex-col gap-3 mb-4 p-4 bg-blue-600/10 rounded-lg border border-blue-600/20">
                                <button
                                    className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleRoomAction('kick')}
                                    disabled={actionLoading || targetUserId === null || targetUserId === user?.id}
                                >
                                    <UserMinus size={18} /> Kick Selected
                                </button>
                                <button
                                    className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleRoomAction('admin')}
                                    disabled={actionLoading || targetUserId === null || targetUserId === user?.id}
                                >
                                    <ShieldAlert size={18} /> Make Admin
                                </button>
                            </div>
                        )}

                        <button
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            onClick={() => { setShowUsersModal(false); setTargetUserId(null); }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}