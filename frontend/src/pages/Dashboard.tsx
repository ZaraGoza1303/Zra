// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    LogOut, Plus, Search, MessageSquare, Image as ImageIcon,
    Settings, Home, Users, Bell, X,
    User,
    Grid2x2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { apiCall, getUserImageUrl } from '../services/api';
import ChatRoom from '../components/ChatRoom';
import ContactsPanel from '../components/contacts/ContactsPanel';
import ProfileModal from '../components/ProfileModal';
import { useSearchParams } from 'react-router-dom';
import type { Room } from '../types/chat';
import { BACKEND_URL } from '../config';
import { useToastStore } from '../store/toastStore';
import type { UnreadNotif } from '../types/contacts';
import IncomingCallPopup from '../components/call/IncomingCallPopup';
import CallOverlay from '../components/call/CallOverlay';
import { useCallManager } from '../hooks/useCallManager';
import ImageCropModal from '../components/ImageCropModal';

type NavItem = 'home' | 'rooms' | 'chats' | 'contacts' | 'settings';

const sortByLatest = (arr: Room[]) => [...arr].sort((a, b) => {
    const aTime = a.last_message?.sent_at || '';
    const bTime = b.last_message?.sent_at || '';
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
});

export default function Dashboard() {
    const { user, logoutState } = useAuthStore();
    const {
        rooms, setRooms,
        selectedRoom, setSelectedRoom,
        dmRoom, setDmRoom,
        searchTerm, setSearchTerm,
        activeNav, setActiveNav,
        isModalOpen, setIsModalOpen,
        isProfileModalOpen, setIsProfileModalOpen,
    } = useDashboardStore();

    const [searchParams, setSearchParams] = useSearchParams();
    const [creating, setCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDescription, setNewRoomDescription] = useState('');
    const [newRoomImage, setNewRoomImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

    const [friendRequestNotif, setFriendRequestNotif] = useState(0);
    const [friendAcceptedNotif, setFriendAcceptedNotif] = useState(0);
    const contactsNotif = friendRequestNotif + friendAcceptedNotif;

    const { allRooms } = useDashboardStore();
    const unreadGroups = allRooms.filter(r => r.type === 'group').reduce((sum, r) => sum + (r.unread_message ?? 0), 0);
    const unreadPrivate = allRooms.filter(r => r.type === 'private').reduce((sum, r) => sum + (r.unread_message ?? 0), 0);
    const unreadAll = unreadGroups + unreadPrivate;
    const unreadHomeOnly = activeNav === 'rooms' ? unreadPrivate : activeNav === 'chats' ? unreadGroups : unreadAll;

    const globalWs = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleCallSignalRef = useRef<((msg: any) => void) | null>(null);
    const { token } = useAuthStore();


    const connectGlobalWs = React.useCallback(() => {
        if (!token) return;

        const wsBaseUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        const ws = new WebSocket(`${wsBaseUrl}/ws/global?token=${token}`);
        globalWs.current = ws;

        ws.onopen = () => {
            console.log('Global WS connected');
            // Kasih delay biar backend Hub sempet register user ini ke GlobalClients map 
            setTimeout(() => {
                fetchOnlineUsers();
            }, 500);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'chat') {
                    const { rooms, setRooms, allRooms, setAllRooms } = useDashboardStore.getState();

                    const isSentByMe = msg.user_id === user?.id;
                    const isActiveRoom = useDashboardStore.getState().selectedRoom?.id === msg.room_id ||
                        useDashboardStore.getState().dmRoom?.id === msg.room_id;

                    const updater = (r: Room) => r.id === msg.room_id
                        ? {
                            ...r,
                            last_message: { content: msg.content, username: msg.username, sent_at: msg.time_stamp },
                            unread_message: (isSentByMe || isActiveRoom) ? 0 : (r.unread_message ?? 0) + 1
                        }
                        : r;

                    setRooms(sortByLatest(rooms.map(updater)));
                    setAllRooms(sortByLatest(allRooms.map(updater)));
                }

                if (msg.type === 'friend-request' || msg.type === 'friend-rejected') {
                    useToastStore.getState().showToast(msg.content, msg.type === 'friend-rejected' ? 'error' : 'info');
                    setFriendRequestNotif(prev => prev + 1);
                }


                if (msg.type === 'friend-accepted') {
                    useToastStore.getState().showToast(msg.content, 'success');
                    setFriendAcceptedNotif(prev => prev + 1);
                }

                if (msg.type === 'added-to-room') {
                    useToastStore.getState().showToast(`You've been added to a room!`, 'info');
                    (async () => {
                        try {
                            const res = await apiCall<{ data: Room[] }>(`/room?search=`, { method: 'GET' });
                            const freshRooms = res.data || [];
                            const withUnread = freshRooms.map(r =>
                                r.id === msg.room_id ? { ...r, unread_message: (r.unread_message ?? 0) || 1 } : r
                            );
                            const { setAllRooms, setRooms, activeNav } = useDashboardStore.getState();
                            setAllRooms(withUnread);
                            if (activeNav === 'home') setRooms(withUnread);
                            else if (activeNav === 'rooms') setRooms(withUnread.filter(r => r.type === 'group'));
                            else if (activeNav === 'chats') setRooms(withUnread.filter(r => r.type === 'private'));
                        } catch (e) {
                            console.error(e);
                        }
                    })();
                }

                if (['call-offer', 'call-answer', 'ice-candidate', 'call-rejected', 'call-ended', 'call-mute-toggle'].includes(msg.type)) {
                    handleCallSignalRef.current?.(msg); // ← selalu fresh, tidak stale
                }

                if (msg.type === 'user-online') {
                    console.log('🟢 [Global WS] Received user-online:', msg);
                    setOnlineUserIds(prev => new Set([...prev, Number(msg.user_id)]));
                }

                if (msg.type === 'user-offline') {
                    console.log('🔴 [Global WS] Received user-offline for:', msg.user_id);
                    setOnlineUserIds(prev => {
                        const next = new Set(prev);
                        next.delete(Number(msg.user_id));
                        console.log('State updated. Current online IDs:', Array.from(next));
                        return next;
                    });
                }

            } catch (e) {
                console.error('Global WS error:', e);
            }
        };

        ws.onclose = () => {
            if (globalWs.current !== ws) return;
            console.log('Global WS disconnected, reconnecting in 3s...');
            reconnectTimeout.current = setTimeout(() => {
                connectGlobalWs();
            }, 3000);
        };

        ws.onerror = (err) => {
            console.error('Global WS error:', err);
            ws.close(); // trigger onclose → reconnect
        };
    }, [token]);

    useEffect(() => {
        connectGlobalWs();
        return () => {
            reconnectTimeout.current && clearTimeout(reconnectTimeout.current);
            if (globalWs.current) {
                const ws = globalWs.current;
                globalWs.current = null;
                ws.close();
            }
        };
    }, [connectGlobalWs]);

    useEffect(() => {
        const roomIdToOpen = searchParams.get('open');
        if (roomIdToOpen && rooms.length > 0) {
            const foundRoom = rooms.find(r => r.id === roomIdToOpen);
            if (foundRoom) {
                setSelectedRoom(foundRoom);
                setSearchParams({});
            }
        }
    }, [searchParams, rooms, setSelectedRoom, setSearchParams]);

    // Fetch unread count on mount
    const fetchUnreadNotifCount = async () => {
        try {
            const res = await apiCall<{ data: UnreadNotif[] }>('/user/unread-notifications', { method: 'GET' });
            const data = res.data || [];

            const friendReq = Number(data.find(d => d.type === 'friend-request')?.count ?? 0);
            const friendRej = Number(data.find(d => d.type === 'friend-rejected')?.count ?? 0);
            const friendAcc = Number(data.find(d => d.type === 'friend-accepted')?.count ?? 0);

            setFriendRequestNotif(friendReq + friendRej);
            setFriendAcceptedNotif(friendAcc);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchUnreadNotifCount();
    }, []);

    const fetchOnlineUsers = async () => {
        try {
            const res = await apiCall<{ data: number[] }>(`/user/online?t=${Date.now()}`, { method: 'GET' });
            setOnlineUserIds(new Set(res.data || []));
        } catch (e) {
            console.error('Failed to fetch online users', e);
        }
    };

    const fetchRooms = useCallback(async (search?: string) => {
        const term = search !== undefined ? search : searchTerm;
        try {
            const res = await apiCall<{ data: Room[] }>(`/room?search=${term}`, { method: 'GET' });
            const freshRooms = res.data || [];

            const { activeNav } = useDashboardStore.getState();

            if (term) {
                if (activeNav === 'rooms') setRooms(sortByLatest(freshRooms.filter(r => r.type === 'group')));
                else if (activeNav === 'chats') setRooms(sortByLatest(freshRooms.filter(r => r.type === 'private')));
                else setRooms(sortByLatest(freshRooms));
                return;
            }

            const { allRooms, setAllRooms } = useDashboardStore.getState();
            const merged = freshRooms.map(r => {
                const existing = allRooms.find(cr => cr.id === r.id);
                return existing ? { ...r, unread_message: existing.unread_message } : r;
            });

            setAllRooms(sortByLatest(merged));

            if (activeNav === 'home') setRooms(sortByLatest(merged));
            else if (activeNav === 'rooms') setRooms(sortByLatest(merged.filter(r => r.type === 'group')));
            else if (activeNav === 'chats') setRooms(sortByLatest(merged.filter(r => r.type === 'private')));
        } catch (err) {
            console.error('Failed to fetch rooms', err);
        }
    }, [searchTerm, activeNav]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleLogout = async () => {
        try {
            if (globalWs.current) {
                const ws = globalWs.current;
                globalWs.current = null;
                ws.close(1000, 'logout');
            }
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
            useToastStore.getState().showToast('Room created successfully', 'success');
            fetchRooms();
        } catch (err) {
            console.error('Create room failed', err);
        } finally {
            setCreating(false);
        }
    };

    const handleOpenDM = (roomId: string, targetName: string, targetPicture?: string) => {
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

    const signalQueue = useRef<{ type: string, payload: object, toId: number }[]>([]);

    const flushSignalQueue = useCallback(() => {
        if (globalWs.current?.readyState === WebSocket.OPEN && signalQueue.current.length > 0) {
            while (signalQueue.current.length > 0) {
                const { type, payload, toId } = signalQueue.current.shift()!;
                globalWs.current.send(JSON.stringify({
                    type,
                    to_id: toId,
                    ...payload
                }));
            }
        }
    }, []);

    const sendSignal = useCallback((type: string, payload: object, toId: number) => {
        if (globalWs.current?.readyState === WebSocket.OPEN) {
            console.log(`📡 Kirim signal [${type}] ke user ${toId}`);
            globalWs.current.send(JSON.stringify({
                type,
                to_id: toId,
                ...payload
            }));
        } else {
            console.warn(`⚠️ Global WS not ready, queuing signal [${type}] for user ${toId}`);
            signalQueue.current.push({ type, payload, toId });
        }
    }, []);

    // Flush queue on connection
    useEffect(() => {
        const checkConnection = setInterval(() => {
            if (globalWs.current?.readyState === WebSocket.OPEN) {
                flushSignalQueue();
                clearInterval(checkConnection);
            }
        }, 500);
        return () => clearInterval(checkConnection);
    }, [flushSignalQueue]);


    const {
        callState,
        callInfo,
        localStream,
        remoteStream,
        initiateCall,
        acceptCall,
        rejectCall,
        handleEndCall,
        handleCallSignal,
        toggleMute,
        toggleVideo,
        partnerMuted,
    } = useCallManager({ sendSignal });

    handleCallSignalRef.current = handleCallSignal;

    useEffect(() => {
        const handler = (e: Event) => {
            initiateCall((e as CustomEvent).detail);
        };
        window.addEventListener('initiate-call', handler);
        return () => window.removeEventListener('initiate-call', handler);
    }, [initiateCall]);


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
        { key: 'rooms', icon: <Grid2x2 size={20} />, label: 'Rooms' },
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
                            <div className="relative">
                                {item.icon}

                                {item.key === 'contacts' && contactsNotif > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                        {contactsNotif > 9 ? '9+' : contactsNotif}
                                    </span>
                                )}
                                {item.key === 'home' && unreadHomeOnly > 0 && activeNav !== 'home' && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                        {unreadAll > 99 ? '99+' : unreadAll}
                                    </span>
                                )}
                                {item.key === 'rooms' && unreadGroups > 0 && activeNav !== 'rooms' && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                        {unreadGroups > 99 ? '99+' : unreadGroups}
                                    </span>
                                )}
                                {item.key === 'chats' && unreadPrivate > 0 && activeNav !== 'chats' && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                        {unreadPrivate > 99 ? '99+' : unreadPrivate}
                                    </span>
                                )}
                            </div>
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
                friendRequestNotif={friendRequestNotif}
                friendAcceptedNotif={friendAcceptedNotif}
                onRequestTabOpen={() => {
                    setFriendRequestNotif(0);
                    apiCall('/user/read-notifications', { method: 'PUT' }).catch(console.error);
                }}
                onFriendsTabOpen={() => {
                    setFriendAcceptedNotif(0);
                    apiCall('/user/read-notifications', { method: 'PUT' }).catch(console.error);
                }}
                onlineUserIds={onlineUserIds}
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
                                        onClick={() => setSelectedRoom(room)}
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

                                            {room.unread_message && room.unread_message > 0 ? (
                                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#111318]">
                                                    {room.unread_message > 99 ? '99+' : room.unread_message}
                                                </span>
                                            ) : room.type === 'private' && room.members?.some(m => m.user_id !== user?.id && onlineUserIds.has(m.user_id)) ? (
                                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111318]" />
                                            ) : null}
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
                                                    {room.last_message?.content
                                                        ? `${room.last_message.username}: ${room.last_message.content}`
                                                        : (room.type === 'private' ? 'No messages yet' : 'Tap to join chat')
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
                        key={dmRoom ? `dm-${dmRoom.id}` : `room-${selectedRoom!.id}`}
                        roomId={dmRoom ? dmRoom.id : selectedRoom!.id}
                        roomName={dmRoom ? dmRoom.name : getRoomDisplayInfo(selectedRoom!).name}
                        roomPicture={dmRoom
                            ? (dmRoom.picture ? getUserImageUrl(dmRoom.picture) : undefined)
                            : (getRoomDisplayInfo(selectedRoom!).picture || undefined)
                        }
                        roomType={dmRoom ? 'private' : (selectedRoom?.type ?? 'group')}
                        onBack={() => { setSelectedRoom(null); setDmRoom(null); }}
                        onNewMessage={(msgRoomId, message) => {
                            const { selectedRoom, dmRoom, rooms, setRooms, allRooms, setAllRooms } = useDashboardStore.getState();
                            const isActiveRoom = selectedRoom?.id === msgRoomId || dmRoom?.id === msgRoomId;

                            const updater = (r: Room) => r.id === msgRoomId
                                ? { ...r, last_message: message, unread_message: isActiveRoom ? 0 : (r.unread_message ?? 0) + 1 }
                                : r;

                            setRooms(sortByLatest(rooms.map(updater)));
                            setAllRooms(sortByLatest(allRooms.map(updater)));
                        }}
                        onRoomResolved={(resolvedRoomId) => {
                            const { dmRoom } = useDashboardStore.getState();
                            setDmRoom(dmRoom ? { ...dmRoom, id: resolvedRoomId } : null);
                        }}
                        onlineUserIds={onlineUserIds}
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
                                            if (e.target.files?.[0]) setCropFile(e.target.files[0]);
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

            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onConfirm={(croppedFile) => {
                        setNewRoomImage(croppedFile);
                        setCropFile(null);
                    }}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {/* PROFILE MODAL */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            {callState === 'incoming' && callInfo && (
                <IncomingCallPopup
                    callerName={callInfo.partnerName}
                    callerPicture={callInfo.partnerPicture}
                    withVideo={callInfo.withVideo}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                />
            )}

            {(callState === 'active' || callState === 'calling') && callInfo && (
                <CallOverlay
                    partnerName={callInfo.partnerName}
                    partnerPicture={callInfo.partnerPicture}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    withVideo={callInfo.withVideo}
                    isCaller={callInfo.isCaller}
                    onEnd={handleEndCall}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    partnerMuted={partnerMuted}
                />
            )}

        </div>
    );
}