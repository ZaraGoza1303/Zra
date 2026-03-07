// src/pages/Dashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
    LogOut, Plus, Search, MessageSquare, Image as ImageIcon,
    Settings, Home, Users, Bell, X,
    User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getRoomImageUrl, getUserImageUrl } from '../services/api';
import ChatRoom from '../components/ChatRoom';
import ContactsPanel from '../components/contacts/ContactsPanel';
import ProfileModal from '../components/ProfileModal';
import { useSearchParams } from 'react-router-dom';
import type { Room } from '../types/chat';

type NavItem = 'home' | 'rooms' | 'chats' | 'contacts' | 'settings';

export default function Dashboard() {
    const { user, logoutState } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [dmRoom, setDmRoom] = useState<{ id: string; name: string; picture?: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDescription, setNewRoomDescription] = useState('');
    const [newRoomImage, setNewRoomImage] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [activeNav, setActiveNav] = useState<NavItem>('home');

    useEffect(() => {
        const roomIdToOpen = searchParams.get('open');
        if (roomIdToOpen && rooms.length > 0) {
            const foundRoom = rooms.find(r => r.id === roomIdToOpen);
            if (foundRoom) {
                setSelectedRoom(foundRoom);
                setSearchParams({});
            }
        }
    }, [searchParams, rooms]);

    const fetchRooms = async () => {
        try {
            const res = await apiCall<{ data: Room[] }>(`/room?search=${searchTerm}`, { method: 'GET' });
            const allRooms = res.data || [];

            if (activeNav === 'home') {
                setRooms(allRooms);
            } else if (activeNav === 'rooms') {
                setRooms(allRooms.filter(r => r.type === 'group'));
            } else if (activeNav === 'chats') {
                setRooms(allRooms.filter(r => r.type === 'private'));
            }
        } catch (err) {
            console.error('Failed to fetch rooms', err);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [searchTerm, activeNav]);

    const handleLogout = async () => {
        try {
            await apiCall('/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user?.id, refresh_token: user?.refresh_token }),
            });
        } catch (e) {
            console.error(e);
        } finally {
            logoutState();
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName.trim() || !newRoomDescription.trim()) return;
        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('id', crypto.randomUUID());
            formData.append('owner_id', String(user?.id || 0));
            formData.append('name', newRoomName);
            if (newRoomDescription) formData.append('description', newRoomDescription);
            if (newRoomImage) formData.append('picture', newRoomImage);

            await apiCall('/room', { method: 'POST', body: formData });

            setNewRoomName('');
            setNewRoomDescription('');
            setNewRoomImage(null);
            setIsModalOpen(false);
            fetchRooms();
        } catch (err) {
            console.error('Create room failed', err);
        } finally {
            setCreating(false);
        }
    };

    const handleOpenDM = (roomId: string, targetName: string, targetPicture?: string) => {
        setSelectedRoom(null)
        setDmRoom({ id: roomId, name: targetName, picture: targetPicture });
        setActiveNav('chats'); // switch ke tab chats
    };

    const getRoomDisplayInfo = (room: Room): { name: string; picture: string | null } => {
        if (room.type !== 'private') {
            return { name: room.name, picture: room.picture };
        }
        // Untuk private room, cari member yang bukan kita
        const otherMember = room.members?.find(m => m.user_id !== user?.id);
        return {
            name: otherMember?.username || 'Direct Message',
            picture: otherMember?.user_profile_picture || null,  // sudah full URL dari BE
        };
    };


    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (days === 1) return 'Yesterday';
        if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const navItems: { key: NavItem; icon: React.ReactNode; label: string }[] = [
        { key: 'home', icon: <Home size={20} />, label: 'Home' },
        { key: 'rooms', icon: <Users size={20} />, label: 'Rooms' },
        { key: 'chats', icon: <MessageSquare size={20} />, label: 'Chats' },
        { key: 'contacts', icon: <Users size={20} />, label: 'Contacts' },
        { key: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    ];

    return (
        <div className="flex w-full h-screen bg-[#0d1117] text-[#e6edf3] overflow-hidden">

            {/* NARROW ICON SIDEBAR */}
            <div className="flex flex-col items-center py-5 px-2 gap-2 w-16 min-w-[64px] bg-[#0d1117] border-r border-white/5 z-10">
                {/* Logo */}
                <div
                    onClick={() => setActiveNav('home')}
                    className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30 cursor-pointer hover:bg-blue-700 transition-colors"
                >
                    <MessageSquare size={18} className="text-white" />
                </div>

                {/* Nav Items */}
                <div className="flex flex-col gap-1 flex-1">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => {
                                setActiveNav(item.key);
                                if (item.key === 'settings') setIsProfileModalOpen(true);
                            }}
                            title={item.label}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group
                                ${activeNav === item.key
                                    ? 'bg-blue-600/20 text-blue-400'
                                    : 'text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3]'
                                }`}
                        >
                            {item.icon}
                            {activeNav === item.key && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full -ml-2" />
                            )}
                        </button>
                    ))}
                </div>

                {/* User Avatar */}
                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-200 focus:outline-none"
                    title={user?.name}
                >
                    {user?.profile_picture ? (
                        <img
                            src={getUserImageUrl(user.profile_picture)}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-[#1c2128] border border-white/10 flex items-center justify-center text-[#8b949e]">
                            <User size={18} />
                        </div>
                    )}
                </button>
            </div>

            <ContactsPanel
                isVisible={activeNav === 'contacts'}
                onOpenDM={handleOpenDM}
            />

            {/* ROOM LIST PANEL */}
            {activeNav !== 'contacts' && activeNav !== "settings" && (
                <div className="flex flex-col w-[300px] min-w-[260px] bg-[#111318] border-r border-white/5">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-5 pt-6 pb-4">
                        <h1 className="text-xl font-bold text-[#e6edf3]">
                            {activeNav === 'home' ? 'Home' : activeNav === 'rooms' ? 'Rooms' : 'Messages'}
                        </h1>
                        <div className="flex gap-1">
                            <button
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                                title="Notifications"
                            >
                                <Bell size={16} />
                            </button>
                            {activeNav === 'rooms' && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/30"
                                    title="New Room"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-4 pb-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#1c2128] rounded-xl border border-white/5">
                            <Search size={14} className="text-[#8b949e] shrink-0" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none w-full"
                            />
                        </div>
                    </div>

                    {/* Room List */}
                    <div className="flex-1 overflow-y-auto px-2">
                        {rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-[#8b949e] text-sm gap-2">
                                <MessageSquare size={28} className="opacity-30" />
                                {activeNav === "home" ? <span>No rooms found. Create one!</span> : <span>No chats found. Start a conversation!</span>}
                            </div>
                        ) : (
                            rooms.map(room => {
                                const display = getRoomDisplayInfo(room);
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => { setSelectedRoom(room); setDmRoom(null); }}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left mb-0.5
                ${selectedRoom?.id === room.id
                                                ? 'bg-blue-600/15 border border-blue-600/20'
                                                : 'hover:bg-white/4 border border-transparent'
                                            }`}
                                    >
                                        <div className="relative shrink-0">
                                            {display.picture ? (
                                                <img
                                                    src={display.picture}
                                                    alt={display.name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-[#1c2128] border border-white/10 flex items-center justify-center text-[#8b949e]">
                                                    {room.type === 'private' ? <User size={20} /> : <Users size={20} />}
                                                </div>
                                            )}
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111318]" />
                                        </div>

                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium text-sm text-[#e6edf3] truncate">
                                                    {display.name}
                                                </span>
                                                <span className="text-[10px] text-[#8b949e] shrink-0">
                                                    {formatTime(room.last_message?.sent_at || room.updated_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-xs text-[#8b949e] truncate flex items-center gap-1">
                                                    {room.last_message
                                                        ? `${room.last_message.username}: ${room.last_message.content}`
                                                        : (room.type === 'private' ? 'No messages yet' : room.description || 'Tap to join chat')
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Logout at bottom */}
                    <div className="p-3 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[#8b949e] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm font-medium"
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
                {selectedRoom || dmRoom ? (
                    <ChatRoom
                        roomId={dmRoom ? dmRoom.id : selectedRoom!.id}
                        roomName={dmRoom ? dmRoom.name : getRoomDisplayInfo(selectedRoom!).name}
                        roomPicture={dmRoom
                            ? (dmRoom.picture ? getUserImageUrl(dmRoom.picture) : undefined)
                            : (getRoomDisplayInfo(selectedRoom!).picture || undefined)
                        }
                        roomType={dmRoom ? 'private' : (selectedRoom?.type ?? 'group')}
                        onBack={() => { setSelectedRoom(null); setDmRoom(null); }}
                        onNewMessage={(roomId, message) => {
                            setRooms(prev => prev.map(r =>
                                r.id === roomId
                                    ? { ...r, last_message: message }
                                    : r
                            ));
                        }}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#8b949e] text-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-white/3 border border-white/5 flex items-center justify-center">
                            <MessageSquare size={40} className="opacity-20" />
                        </div>
                        <div>
                            <h2 className="text-[#e6edf3] font-semibold text-xl mb-1">Select a Conversation</h2>
                            <p className="text-sm max-w-xs leading-relaxed">
                                Pick a room from the sidebar to start messaging, or create a new one.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/30"
                        >
                            <Plus size={16} /> New Room
                        </button>
                    </div>
                )}
            </div>

            {/* CREATE ROOM MODAL */}
            {isModalOpen && (
                <div
                    onClick={() => setIsModalOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-[#e6edf3]">Create New Room</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Room Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Gamers Indo"
                                    value={newRoomName}
                                    onChange={e => setNewRoomName(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] placeholder-[#8b949e] text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Description</label>
                                <textarea
                                    placeholder="What's this room about?"
                                    value={newRoomDescription}
                                    onChange={e => setNewRoomDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] placeholder-[#8b949e] text-sm focus:outline-none focus:border-blue-500/60 transition-colors resize-none font-[inherit]"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Room Image</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-[#8b949e]"
                                >
                                    {newRoomImage ? (
                                        <>
                                            <span className="text-green-400 font-medium text-sm">✓ File Selected</span>
                                            <span className="text-xs truncate max-w-[200px]">{newRoomImage.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon size={24} className="opacity-50" />
                                            <span className="text-sm">Click to upload room picture</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={e => {
                                            if (e.target.files?.[0]) setNewRoomImage(e.target.files[0]);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !newRoomName.trim() || !newRoomDescription.trim()}
                                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    {creating ? 'Creating...' : 'Create Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PROFILE MODAL */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}