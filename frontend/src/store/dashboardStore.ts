// src/store/dashboardStore.ts
import { create } from 'zustand';
import type { Room } from '../types/chat';

type NavItem = 'home' | 'rooms' | 'chats' | 'contacts' | 'settings';

interface DashboardState {
    allRooms: Room[];
    rooms: Room[];
    selectedRoom: Room | null;
    dmRoom: { id: string; name: string; picture?: string | null; partnerId?: number; type?: 'group' | 'private' } | null;
    searchTerm: string;
    activeNav: NavItem;
    isModalOpen: boolean;
    isProfileModalOpen: boolean;
    setAllRooms: (rooms: Room[]) => void;
    setRooms: (rooms: Room[]) => void;
    setSelectedRoom: (room: Room | null) => void;
    setDmRoom: (dmRoom: { id: string; name: string; picture?: string | null; partnerId?: number; type?: 'group' | 'private' } | null) => void;
    setSearchTerm: (term: string) => void;
    setActiveNav: (nav: NavItem) => void;
    setIsModalOpen: (isOpen: boolean) => void;
    setIsProfileModalOpen: (isOpen: boolean) => void;
    updateRoom: (roomId: string, updates: Partial<Room>) => void;
    handleNewMessage: (roomId: string, message: any, increment: number, currentUserId: number) => void;
    markRoomAsRead: (roomId: string) => void;
}

const sortByLatest = (arr: Room[]) => [...arr].sort((a, b) => {
    const aTime = a.last_message?.sent_at || a.updated_at || '';
    const bTime = b.last_message?.sent_at || b.updated_at || '';
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
});

export const useDashboardStore = create<DashboardState>((set) => ({
    allRooms: [],
    rooms: [],
    selectedRoom: null,
    dmRoom: null,
    searchTerm: '',
    activeNav: 'home',
    isModalOpen: false,
    isProfileModalOpen: false,

    setAllRooms: (allRooms) => set({ allRooms }),
    setRooms: (rooms) => set({ rooms }),
    setSelectedRoom: (selectedRoom) => set({ selectedRoom, dmRoom: null }),
    setDmRoom: (dmRoom) => set({ dmRoom, selectedRoom: null }),
    setSearchTerm: (searchTerm) => set({ searchTerm }),
    setActiveNav: (activeNav) => set({ activeNav }),
    setIsModalOpen: (isModalOpen) => set({ isModalOpen }),
    setIsProfileModalOpen: (isProfileModalOpen) => set({ isProfileModalOpen }),
    updateRoom: (roomId: string, updates: Partial<Room>) => set(state => ({
        rooms: state.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r),
        allRooms: state.allRooms.map(r => r.id === roomId ? { ...r, ...updates } : r),
        selectedRoom: state.selectedRoom?.id === roomId ? { ...state.selectedRoom, ...updates } as Room : state.selectedRoom,
        dmRoom: state.dmRoom?.id === roomId ? { ...state.dmRoom, ...(updates as any) } : state.dmRoom,
    })),
    handleNewMessage: (roomId, message, increment, currentUserId) => set(state => {
        const updatedAllRooms = state.allRooms.map(r => {
            if (r.id === roomId) {
                return {
                    ...r,
                    unread_message: (r.unread_message || 0) + increment,
                    last_message: message
                };
            }
            return r;
        });

        const sortedAllRooms = sortByLatest(updatedAllRooms);

        // Re-apply current filters to 'rooms' list
        let filtered = sortedAllRooms;
        if (state.activeNav === 'rooms') {
            filtered = filtered.filter(r => r.type === 'group');
        } else if (state.activeNav === 'chats') {
            filtered = filtered.filter(r => r.type === 'private');
        }

        if (state.searchTerm) {
            const searchLower = state.searchTerm.toLowerCase();
            filtered = filtered.filter(r => {
                if (r.type === 'group') {
                    return r.name?.toLowerCase().includes(searchLower);
                } else {
                    const otherUser = r.members?.find(m => m.user_id !== currentUserId);
                    return otherUser?.username?.toLowerCase().includes(searchLower);
                }
            });
        }

        return {
            allRooms: sortedAllRooms,
            rooms: sortByLatest(filtered),
            selectedRoom: (state.selectedRoom?.id === roomId && state.selectedRoom)
                ? { ...state.selectedRoom, last_message: message } as Room
                : state.selectedRoom,
            dmRoom: state.dmRoom?.id === roomId
                ? { ...state.dmRoom, last_message: message as any }
                : state.dmRoom,
        };
    }),
    markRoomAsRead: (roomId: string) => set(state => {
        const updatedAllRooms = state.allRooms.map(r =>
            r.id === roomId ? { ...r, unread_message: 0 } : r
        );

        let filtered = updatedAllRooms;
        if (state.activeNav === 'rooms') {
            filtered = filtered.filter(r => r.type === 'group');
        } else if (state.activeNav === 'chats') {
            filtered = filtered.filter(r => r.type === 'private');
        }

        return {
            allRooms: updatedAllRooms,
            rooms: sortByLatest(filtered),
            selectedRoom: (state.selectedRoom?.id === roomId && state.selectedRoom)
                ? { ...state.selectedRoom, unread_message: 0 } as Room
                : state.selectedRoom,
            dmRoom: state.dmRoom?.id === roomId ? { ...state.dmRoom, unread_message: 0 } as any : state.dmRoom,
        };
    }),
}));
