// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    LogOut, Plus, Search, MessageSquare, Image as ImageIcon,
    Settings, Home, Users, Bell, X,
    User as UserIcon,
    Grid2x2,
    Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { apiCall, getUserImageUrl } from '../services/api';
import { formatLastMessage } from '../utils/roomUtils';
import ChatRoom from '../components/chat/ChatRoom';
import ContactsPanel from '../components/contact/ContactsPanel';
import ProfileModal from '../components/ProfileModal';
import SettingsView from '../components/SettingsView';
import ThemeSettings from '../components/settings/ThemeSettings';
import AccountSettings from '../components/settings/AccountSettings';
import PrivacySettings from '../components/settings/PrivacySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { LastMessage, Room } from '../types/chat';
import { BACKEND_URL } from '../config';
import { useToastStore } from '../store/toastStore';
import IncomingCallPopup from '../components/call/IncomingCallPopup';
import CallOverlay from '../components/call/CallOverlay';
import { useCallManager } from '../hooks/useCallManager';
import { useNotificationSound } from '../hooks/useNotificationSound';
import ImageCropModal from '../components/ImageCropModal';


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
    const navigate = useNavigate();
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
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [friendRequestNotif, setFriendRequestNotif] = useState(0);
    const [friendAcceptedNotif, setFriendAcceptedNotif] = useState(0);
    const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
    const contactsNotif = friendRequestNotif + friendAcceptedNotif;

    const { allRooms, setAllRooms } = useDashboardStore();
    const settings = useSettingsStore();
    const { playNotificationSound } = useNotificationSound();
    const unreadGroups = allRooms
        .filter(r => r.type === 'group' && settings.group_notif)
        .reduce((sum, r) => sum + (r.unread_message ?? 0), 0);
    const unreadPrivate = allRooms
        .filter(r => r.type === 'private' && settings.message_notif)
        .reduce((sum, r) => sum + (r.unread_message ?? 0), 0);
    const unreadAll = unreadGroups + unreadPrivate;
    const unreadHomeOnly = activeNav === 'rooms' ? unreadPrivate : activeNav === 'chats' ? unreadGroups : unreadAll;

    const globalWs = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleCallSignalRef = useRef<((msg: any) => void) | null>(null);
    const isDashboardMounted = useRef(true);

    // Refs for values used in WebSocket handlers to prevent re-creation
    const userRef = useRef(user);
    const activeNavRef = useRef(activeNav);
    const setRoomsRef = useRef(setRooms);
    const setAllRoomsRef = useRef(setAllRooms);

    // Keep refs updated
    userRef.current = user;
    activeNavRef.current = activeNav;
    setRoomsRef.current = setRooms;
    setAllRoomsRef.current = setAllRooms;

    const sendSignal = useCallback((type: string, payload: object, toId: number) => {
        if (globalWs.current?.readyState === WebSocket.OPEN) {
            globalWs.current.send(JSON.stringify({
                type,
                to_id: toId,
                ...payload
            }));
        }
    }, []);

    const callManager = useCallManager({ sendSignal });
    const {
        callState,
        callInfo,
        localStream,
        remoteStream,
        partnerMuted,
        initiateCall,
        acceptCall,
        rejectCall,
        handleEndCall,
        handleCallSignal,
        toggleMute,
        toggleVideo,
    } = callManager;
    handleCallSignalRef.current = handleCallSignal;

    const connectGlobalWs = React.useCallback(() => {
        // Prevent creating multiple WebSocket connections
        if (globalWs.current?.readyState === WebSocket.OPEN || globalWs.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
            return;
        }

        // Cleanup previous
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (globalWs.current) {
            globalWs.current.onclose = null;
            globalWs.current.close();
            globalWs.current = null;
        }

        const wsBaseUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        const ws = new WebSocket(`${wsBaseUrl}/ws/global?token=${currentToken}`);
        globalWs.current = ws;

        ws.onopen = () => {
            console.log('Global WS connected');
            fetchOnlineUsers();
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'chat' || msg.type === 'sticker' || msg.type === 'image') {
                    const roomId = String(msg.room_id || msg.RoomID || "");

                    const isSentByMe = (msg.user_id || msg.UserID) === userRef.current?.id;
                    const isActiveRoom = useDashboardStore.getState().selectedRoom?.id === roomId ||
                        useDashboardStore.getState().dmRoom?.id === roomId;

                    console.log('[DEBUG-WS-MESSAGE] Received message:', {
                        roomId,
                        isSentByMe,
                        isActiveRoom
                    });

                    const contentMap: Record<string, string> = {
                        'sticker': '🎭 Sticker',
                        'image': '📷 Image'
                    };

                    const notificationMsg = {
                        id: msg.id || msg.ID || `notif-${Date.now()}`,
                        room_id: roomId,
                        user_id: msg.user_id || msg.UserID,
                        username: msg.username || msg.Username,
                        name: msg.name || msg.Name,
                        profile_picture: msg.profile_picture || msg.ProfilePicture,
                        content: msg.type === 'chat' ? (msg.content || 'New message') : (contentMap[msg.type] || 'New message'),
                        type: msg.type,
                        time_stamp: msg.time_stamp || msg.TimeStamp || new Date().toISOString(),
                        sent_at: msg.time_stamp || msg.TimeStamp || new Date().toISOString(),
                    };

                    const unreadIncrement = (!isActiveRoom && !isSentByMe) ? 1 : 0;
                    useDashboardStore.getState().handleNewMessage(roomId, notificationMsg, unreadIncrement, user?.id || 0);

                    if (!isActiveRoom && !isSentByMe) {
                        const currentRoom = useDashboardStore.getState().allRooms.find(r => r.id === roomId);
                        const roomType = currentRoom?.type || 'private';
                        const settings = useSettingsStore.getState();
                        const shouldNotify = roomType === 'group' ? settings.group_notif : settings.message_notif;
                        if (shouldNotify) playNotificationSound();
                    }
                } else if (msg.type === 'call_signal' && handleCallSignalRef.current) {
                    handleCallSignalRef.current(msg);
                } else if (msg.type === 'user-online') {
                    setOnlineUserIds(prev => new Set([...prev, msg.user_id]));
                } else if (msg.type === 'user-offline') {
                    setOnlineUserIds(prev => {
                        const next = new Set(prev);
                        next.delete(msg.user_id);
                        return next;
                    });
                } else if (msg.type === 'friend-request') {
                    setFriendRequestNotif(prev => prev + 1);
                    useToastStore.getState().showToast(`New friend request from ${msg.username}`);
                } else if (msg.type === 'friend-accepted') {
                    setFriendAcceptedNotif(prev => prev + 1);
                    useToastStore.getState().showToast(`${msg.username} accepted your friend request`);
                } else if (msg.type === 'added-to-room') {
                    apiCall<{ data: Room[] }>('/room').then(resp => {
                        if (resp.data) {
                            setAllRoomsRef.current(sortByLatest(resp.data));
                        }
                    }).catch(console.error);
                }
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        };

        ws.onclose = () => {
            console.log('Global WS disconnected');
            if (isDashboardMounted.current && useAuthStore.getState().token) {
                reconnectTimeout.current = setTimeout(connectGlobalWs, 3000);
            }
        };

        ws.onerror = (err) => {
            console.error('Global WS error', err);
            ws.close();
        };
    }, []); // Empty deps - using refs instead

    useEffect(() => {
        isDashboardMounted.current = true;
        connectGlobalWs();
        useSettingsStore.getState().fetchSettings();
        return () => {
            // Only cleanup when truly unmounting, not when dependencies change
            isDashboardMounted.current = false;
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
            if (globalWs.current) {
                globalWs.current.onclose = null;
                globalWs.current.close();
                globalWs.current = null;
            }
        };
    }, [connectGlobalWs]);

    useEffect(() => {
        const roomIdParam = searchParams.get('room_id');
        if (roomIdParam && rooms.length > 0) {
            const found = rooms.find(r => r.id === roomIdParam);
            if (found) {
                setSelectedRoom(found);
                setSearchParams({});
            }
        }
    }, [searchParams, rooms, setSelectedRoom, setSearchParams]);

    const fetchRooms = useCallback(async (searchTermVal: string = '') => {
        setIsLoadingRooms(true);
        try {
            // Client-side filtering: always use allRooms and filter locally
            if (allRooms.length > 0) {
                let filtered = allRooms;

                // Filter by type based on activeNav
                if (activeNav === 'rooms') {
                    filtered = filtered.filter(r => r.type === 'group');
                } else if (activeNav === 'chats') {
                    filtered = filtered.filter(r => r.type === 'private');
                }

                // Filter by search term (client-side)
                if (searchTermVal) {
                    const searchLower = searchTermVal.toLowerCase();
                    filtered = filtered.filter(r => {
                        if (r.type === 'group') {
                            return r.name?.toLowerCase().includes(searchLower);
                        } else {
                            // For private rooms, check other user's username
                            const otherUser = r.members?.find(m => m.user_id !== user?.id);
                            return otherUser?.username?.toLowerCase().includes(searchLower);
                        }
                    });
                }

                setRooms(sortByLatest(filtered));
                setIsLoadingRooms(false);
                return;
            }

            // Fallback: fetch from API if allRooms is empty
            const resp = await apiCall<{ data: Room[] }>(`/room?search=${searchTermVal}`);
            const roomsData = resp.data || [];

            console.log('[DEBUG-API-ROOMS] Raw response:', resp.data);
            if (resp.data && resp.data.length > 0) {
                console.log('[DEBUG-API-ROOMS] First room last_message sample:', resp.data[0].last_message);
            }

            let filtered = roomsData;
            if (activeNav === 'rooms') {
                filtered = roomsData.filter(r => r.type === 'group');
            } else if (activeNav === 'chats') {
                filtered = roomsData.filter(r => r.type === 'private');
            }

            setRooms(sortByLatest(filtered));
            setAllRooms(sortByLatest(roomsData));
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        } finally {
            setIsLoadingRooms(false);
        }
    }, [activeNav, allRooms, user?.id, setRooms, setAllRooms]);

    const fetchUnreadNotif = useCallback(async () => {
        try {
            // FIX: Endpoint returns array of { count: number, type: string }
            const resp = await apiCall<{ data: { count: number, type: string }[] }>('/user/unread-notifications');
            const data = resp.data;
            if (Array.isArray(data)) {
                let reqTotal = 0;
                let accTotal = 0;
                data.forEach(n => {
                    if (n.type === 'friend-request') reqTotal = n.count;
                    if (n.type === 'friend-accepted') accTotal = n.count;
                });
                setFriendRequestNotif(reqTotal);
                setFriendAcceptedNotif(accTotal);
            }
        } catch (err) {
            console.error('Failed to fetch unread notif:', err);
        }
    }, [setFriendRequestNotif, setFriendAcceptedNotif]);

    const fetchOnlineUsers = useCallback(async (initToken?: string) => {
        try {
            // FIX: Use singular '/user' instead of '/users'
            const resp = await apiCall<{ data: number[] }>('/user/online', {
                headers: initToken ? { 'Authorization': `Bearer ${initToken}` } : {}
            });
            if (resp.data) setOnlineUserIds(new Set(resp.data));
        } catch (err) {
            console.error('Failed to fetch online users:', err);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (activeNav !== 'settings' && activeNav !== 'contacts') {
            fetchRooms(debouncedSearch);
        }
        fetchUnreadNotif();
    }, [debouncedSearch, activeNav, fetchRooms, fetchUnreadNotif]);

    const handleLogout = useCallback(async () => {
        try {
            if (globalWs.current) {
                globalWs.current.onclose = null;
                globalWs.current.close();
            }
            await apiCall('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user?.id,
                    refresh_token: user?.refresh_token
                }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            logoutState();
            navigate('/login');
        }
    }, [logoutState, navigate, user]);

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName || !newRoomDescription) return;
        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('id', crypto.randomUUID());
            formData.append('owner_id', String(user?.id || 0));
            formData.append('name', newRoomName);
            formData.append('description', newRoomDescription);
            if (newRoomImage) {
                formData.append('picture', newRoomImage);
            }

            await apiCall('/room', {
                method: 'POST',
                body: formData,
            });

            setNewRoomName('');
            setNewRoomDescription('');
            setNewRoomImage(null);
            setIsModalOpen(false);
            setSearchTerm(''); // Clear search on create
            useToastStore.getState().showToast('Room created successfully', 'success');

            // Clear cache first so fetchRooms is forced to re-fetch from API (not serve from stale cache)
            setAllRooms([]);
            fetchRooms('');
        } catch (err) {
            console.error('Failed to create room:', err);
            useToastStore.getState().showToast('Failed to create room', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleOpenDM = useCallback(async (
        roomId: string,
        targetName: string,
        targetPicture?: string,
        targetUserId?: number
    ) => {
        setSelectedRoom(null);
        setDmRoom({
            id: roomId,
            name: targetName,
            picture: targetPicture,
            partnerId: targetUserId,
            type: 'private'
        });
        setTimeout(() => setActiveNav('chats'), 0);
    }, [setActiveNav, setDmRoom, setSelectedRoom]);

    const getRoomDisplayInfo = useCallback((room: Room) => {
        if (room.type === 'group') {
            return {
                name: room.name,
                image: room.picture ? getUserImageUrl(room.picture) : undefined
            };
        }
        const otherUser = room.members?.find(m => m.user_id !== user?.id);
        return {
            name: otherUser?.name || otherUser?.username || 'Unknown User',
            image: otherUser?.user_profile_picture ? getUserImageUrl(otherUser.user_profile_picture) : undefined
        };
    }, [user?.id]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (globalWs.current?.readyState === WebSocket.OPEN) {
                globalWs.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const navItems = [
        { key: 'home', icon: <Home size={22} />, label: 'Home' },
        { key: 'rooms', icon: <Grid2x2 size={22} />, label: 'Groups' },
        { key: 'chats', icon: <MessageSquare size={22} />, label: 'Messages' },
        { key: 'contacts', icon: <Users size={22} />, label: 'Contacts' },
        { key: 'settings', icon: <Settings size={22} />, label: 'Settings' },
    ] as const;

    const settingsSubItems = [
        { key: 'profile', label: 'Profile Settings', icon: <UserIcon size={16} /> },
        { key: 'account', label: 'Account Settings', icon: <Shield size={16} /> },
        { key: 'privacy', label: 'Privacy & Safety', icon: <Shield size={16} /> },
        { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
        { key: 'appearance', label: 'Appearance', icon: <Grid2x2 size={16} /> },
    ];

    return (
        <div className="flex w-full h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">

            {/* REFINED SIDEBAR */}
            <div className={`flex flex-col py-6 px-3 gap-8 ${activeNav === 'settings' ? 'w-64 min-w-[256px]' : 'w-[72px] min-w-[72px] items-center'} bg-[var(--bg-primary)] border-r border-[var(--border-color)] z-10 transition-all duration-300`}>
                {/* Logo & Brand */}
                <div
                    onClick={() => setActiveNav('home')}
                    className={`flex items-center gap-3 mb-2 cursor-pointer group ${activeNav !== 'settings' ? 'justify-center' : 'px-2'}`}
                >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                        <img src="/zra.svg" alt="Zra" className="w-8 h-8 rounded-sm" />
                    </div>
                    {activeNav === 'settings' && (
                        <div className="animate-fade-in whitespace-nowrap overflow-hidden">
                            <h1 className="text-sm font-bold tracking-tight text-[var(--text-primary)] leading-none">Zra</h1>
                            <p className="text-[10px] font-bold text-[var(--accent-color)] tracking-widest uppercase">Chat Messenger</p>
                        </div>
                    )}
                </div>

                {/* Main Navigation */}
                <nav className="flex flex-col gap-2 flex-1 w-full">
                    {navItems.map(item => (
                        <div key={item.key} className="flex flex-col w-full relative">
                            <button
                                onClick={() => setActiveNav(item.key)}
                                className={`flex items-center gap-3 rounded-xl transition-all duration-200 group
                                    ${activeNav === item.key
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                    } ${activeNav === 'settings' ? 'px-4 py-3' : 'p-3 justify-center'}`}
                                title={item.label}
                            >
                                <span className={`transition-colors shrink-0 ${activeNav === item.key ? 'text-[var(--accent-color)]' : 'group-hover:text-[var(--accent-color)]'}`}>
                                    {item.icon}
                                </span>
                                {activeNav === 'settings' && <span className="text-sm font-semibold flex-1 animate-fade-in whitespace-nowrap overflow-hidden">{item.label}</span>}

                                {item.key === 'contacts' && contactsNotif > 0 && (
                                    <span className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center leading-none ${activeNav !== 'settings' ? 'absolute top-1.5 right-1.5 border-2 border-[var(--bg-primary)]' : ''}`}>
                                        {contactsNotif > 9 ? '9+' : contactsNotif}
                                    </span>
                                )}
                                {item.key === 'home' && unreadHomeOnly > 0 && activeNav !== 'home' && (
                                    <span className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center leading-none ${activeNav !== 'settings' ? 'absolute top-1.5 right-1.5 border-2 border-[var(--bg-primary)]' : ''}`}>
                                        {unreadAll > 99 ? '99+' : unreadAll}
                                    </span>
                                )}
                            </button>

                            {/* Settings Sub-items with Grid Accordion Animation */}
                            {item.key === 'settings' && (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateRows: activeNav === 'settings' ? '1fr' : '0fr',
                                        transition: 'grid-template-rows 300ms ease-out',
                                        marginLeft: '2.5rem'
                                    }}
                                >
                                    <div className="overflow-hidden">
                                        <div className="relative mt-1 pt-2">
                                            {/* Vertical connector line */}
                                            <div className="absolute left-1 top-4 bottom-4 w-[2px] bg-[var(--accent-color)]/30 rounded-full" />

                                            <div className="flex flex-col gap-1">
                                                {settingsSubItems.map(sub => (
                                                    <div key={sub.key} className="relative flex items-center">
                                                        {/* Horizontal connector - only from vertical to right */}
                                                        <div className="absolute left-1 w-2 h-[2px] bg-[var(--accent-color)]/50 rounded-r-full" />

                                                        <button
                                                            onClick={() => setActiveSettingsTab(sub.key)}
                                                            className={`text-left pl-5 py-2 text-sm font-medium transition-colors capitalize whitespace-nowrap overflow-hidden ${activeSettingsTab === sub.key
                                                                ? 'text-[var(--text-primary)]'
                                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                                }`}
                                                        >
                                                            {sub.label}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Simple Bottom Logout */}
                <div className={`p-2 border-t border-[var(--border-color)] flex ${activeNav === 'settings' ? 'justify-start' : 'justify-center'}`}>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 text-[var(--text-secondary)] hover:text-red-400 transition-colors group ${activeNav === 'settings' ? 'px-2 py-2' : ''}`}
                        title="Logout"
                    >
                        <LogOut size={20} className="shrink-0" />
                        {activeNav === 'settings' && <span className="text-sm font-medium animate-fade-in">Logout</span>}
                    </button>
                </div>
            </div>

            <ContactsPanel
                isVisible={activeNav === 'contacts'}
                onOpenDM={handleOpenDM}
                friendRequestNotif={friendRequestNotif}
                friendAcceptedNotif={friendAcceptedNotif}
                setFriendRequestNotif={setFriendRequestNotif}
                setFriendAcceptedNotif={setFriendAcceptedNotif}
                onlineUserIds={onlineUserIds}
            />

            {/* SETTINGS VIEW */}
            {activeNav === 'settings' && (
                <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
                    {activeSettingsTab === 'profile' && <SettingsView />}
                    {activeSettingsTab === 'appearance' && <ThemeSettings />}
                    {activeSettingsTab === 'account' && <AccountSettings />}
                    {activeSettingsTab === 'privacy' && <PrivacySettings />}
                    {activeSettingsTab === 'notifications' && <NotificationSettings />}
                </div>
            )}

            {/* CHAT AREA */}
            {activeNav !== 'contacts' && activeNav !== 'settings' && (
                <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
                    <div className="flex h-full overflow-hidden">
                        {/* ROOM LIST PANEL */}
                        <div className="flex flex-col w-[300px] min-w-[260px] bg-[var(--bg-primary)] border-r border-[var(--border-color)]">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                                    {activeNav === 'home' ? 'Home' : activeNav === 'rooms' ? 'Groups' : 'Messages'}
                                </h1>
                                <div className="flex gap-1">
                                    <button
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                        title="Notifications"
                                    >
                                        <Bell size={16} />
                                    </button>
                                    {activeNav === 'rooms' && (
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-color)] text-white hover:opacity-90 transition-colors shadow-md shadow-[var(--accent-color)]/30"
                                            title="New Group"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search */}
                            <div className="px-4 pb-3">
                                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                                    <Search size={14} className="text-[var(--text-muted)] shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="bg-transparent border-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none w-full"
                                    />
                                </div>
                            </div>

                            {/* Room List */}
                            <div className="flex-1 overflow-y-auto px-2 text-[var(--text-primary)]">
                                {isLoadingRooms ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full" />
                                    </div>
                                ) : rooms.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] text-sm gap-2">
                                        <MessageSquare size={28} className="opacity-30" />
                                        {activeNav === "home" ? <span>No groups found. Create one!</span> : <span>No chats found. Start a conversation!</span>}
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
                                                        ? 'bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/20'
                                                        : 'hover:bg-[var(--border-light)] border border-transparent'
                                                    }`}
                                            >
                                                <div className="relative shrink-0">
                                                    {display.image ? (
                                                        <img
                                                            src={display.image}
                                                            alt={display.name}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-[var(--bg-primary)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
                                                            {room.type === 'private' ? <UserIcon size={20} /> : <Users size={20} />}
                                                        </div>
                                                    )}

                                                    {room.unread_message && room.unread_message > 0 ? (
                                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center border-2 border-[var(--bg-primary)]">
                                                            {room.unread_message > 99 ? '99+' : room.unread_message}
                                                        </span>
                                                    ) : room.type === 'private' && room.members?.some(m => m.user_id !== user?.id && onlineUserIds.has(m.user_id)) ? (
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                                                    ) : null}
                                                </div>

                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                                                            {display.name}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                                                            {formatTime(room.last_message?.sent_at || room.updated_at || '')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <span className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">
                                                            {room.last_message ? (
                                                                <>
                                                                    {room.type !== 'private' && room.last_message.username && (
                                                                        <span className="font-semibold text-[var(--accent-color)]">{room.last_message.name || room.last_message.username}: </span>
                                                                    )}
                                                                    {room.last_message.type === 'image' ? (
                                                                        <>
                                                                            <ImageIcon size={12} className="inline mr-0.5" />
                                                                            {formatLastMessage(room.last_message, room.type)}
                                                                        </>
                                                                    ) : formatLastMessage(room.last_message, room.type)}
                                                                </>
                                                            ) : (
                                                                <span className="italic opacity-60">No messages yet</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* CHAT MAIN CONTENT */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {selectedRoom || dmRoom ? (
                                <ChatRoom
                                    key={dmRoom ? `dm-${dmRoom.id}` : `room-${selectedRoom!.id}`}
                                    roomId={dmRoom ? dmRoom.id : selectedRoom!.id}
                                    roomName={dmRoom ? dmRoom.name : getRoomDisplayInfo(selectedRoom!).name}
                                    roomPicture={dmRoom
                                        ? (dmRoom.picture ? getUserImageUrl(dmRoom.picture) : undefined)
                                        : (getRoomDisplayInfo(selectedRoom!).image || undefined)
                                    }
                                    roomType={dmRoom ? 'private' : (selectedRoom?.type ?? 'group')}
                                    onBack={() => { setSelectedRoom(null); setDmRoom(null); }}
                                    onNewMessage={(msgRoomId: string, message: LastMessage) => {
                                        const notificationMsg = {
                                            id: `notif-${Date.now()}`,
                                            room_id: msgRoomId,
                                            user_id: message.user_id || userRef.current?.id,
                                            username: message.username,
                                            name: message.name || (message.user_id === userRef.current?.id ? userRef.current?.name : undefined),
                                            profile_picture: message.profile_picture || (message.user_id === userRef.current?.id ? userRef.current?.profile_picture : undefined),
                                            content: message.content || 'New message',
                                            type: message.type || 'chat',
                                            time_stamp: message.sent_at,
                                            sent_at: message.sent_at,
                                        };

                                        useDashboardStore.getState().markRoomAsRead(msgRoomId);
                                        useDashboardStore.getState().handleNewMessage(msgRoomId, notificationMsg, 0, userRef.current?.id || 0);
                                    }}
                                    onRoomResolved={(resolvedRoomId: string) => {
                                        fetchRooms();
                                        const { dmRoom: currentDm } = useDashboardStore.getState();
                                        setDmRoom(currentDm ? { ...currentDm, id: resolvedRoomId } : null);
                                    }}
                                    onlineUserIds={onlineUserIds}
                                    privatePartnerInfo={dmRoom?.partnerId ? {
                                        user_id: dmRoom.partnerId,
                                        username: dmRoom.name,
                                        user_profile_picture: dmRoom.picture || undefined,
                                    } : undefined}
                                    onStartCall={(withVideo: boolean) => {
                                        const partner = dmRoom ? {
                                            id: dmRoom.partnerId,
                                            name: dmRoom.name,
                                            picture: dmRoom.picture
                                        } : selectedRoom?.members?.find(m => m.user_id !== user?.id)?.username ? {
                                            id: selectedRoom?.members?.find(m => m.user_id !== user?.id)?.user_id,
                                            name: selectedRoom?.members?.find(m => m.user_id !== user?.id)?.username,
                                            picture: selectedRoom?.members?.find(m => m.user_id !== user?.id)?.user_profile_picture
                                        } : null;

                                        if (partner && partner.id) {
                                            initiateCall({
                                                roomId: dmRoom?.id || selectedRoom?.id || '',
                                                partnerId: partner.id,
                                                partnerName: partner.name || 'Unknown',
                                                partnerPicture: partner.picture || undefined,
                                                withVideo: withVideo
                                            });
                                        }
                                    }}
                                    onOpenDM={handleOpenDM}
                                />
                            ) : (
                                <main className="flex-1 flex flex-col bg-[var(--bg-primary)] relative overflow-hidden items-center justify-center text-[var(--text-muted)] text-center gap-4 relative">
                                    <div className="absolute inset-0 bg-[var(--accent-color)]/5 blur-[60px]" />
                                    <div className="w-20 h-20 rounded-3xl bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)] relative z-10 shadow-2xl">
                                        <MessageSquare size={36} className="text-[var(--accent-color)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[var(--text-primary)] font-semibold text-xl mb-1">Select a Conversation</h2>
                                        <p className="text-sm max-w-xs leading-relaxed">
                                            Pick a group from the sidebar to start messaging, or create a new one.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-color)] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-[var(--accent-color)]/30 relative z-10"
                                    >
                                        <Plus size={16} /> New Group
                                    </button>
                                </main>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CALL OVERLAYS */}
            {callState !== 'idle' && callInfo && (
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

            {callState === 'incoming' && callInfo && (
                <IncomingCallPopup
                    callerName={callInfo.partnerName}
                    callerPicture={callInfo.partnerPicture}
                    withVideo={callInfo.withVideo}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                />
            )}

            {/* CREATE ROOM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Create New Group</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-muted)] transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoom} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-[var(--text-muted)] ml-1">Group Name</label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    className="w-full bg-[var(--bg-tertiary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent-color)]/40 outline-none transition-all placeholder:text-[var(--text-muted)]"
                                    placeholder="e.g. Cool Group"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-[var(--text-muted)] ml-1">Group Description</label>
                                <textarea
                                    value={newRoomDescription}
                                    onChange={(e) => setNewRoomDescription(e.target.value)}
                                    className="w-full bg-[var(--bg-tertiary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent-color)]/40 outline-none transition-all resize-none h-28 placeholder:text-[var(--text-muted)]"
                                    placeholder="What's this group about?"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-[var(--text-muted)] ml-1">Group Image (Optional)</label>
                                <div className="flex gap-4 items-center">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-transparent rounded-2xl p-4 transition-all"
                                    >
                                        <ImageIcon size={20} />
                                        <span className="text-sm">Choose Image</span>
                                    </button>
                                    {newRoomImage && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[var(--text-primary)] truncate max-w-[100px]">{newRoomImage.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setNewRoomImage(null)}
                                                className="text-red-400 hover:text-red-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
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

                            <button
                                type="submit"
                                disabled={creating || !newRoomName || !newRoomDescription}
                                className="w-full bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-primary)] font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[var(--accent-color)]/10"
                            >
                                {creating ? 'Creating Group...' : 'Create Group'}
                            </button>
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
        </div>
    );
}