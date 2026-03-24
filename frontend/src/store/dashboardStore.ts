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
}

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
        selectedRoom: state.selectedRoom?.id === roomId ? { ...state.selectedRoom, ...updates } : state.selectedRoom,
        dmRoom: state.dmRoom?.id === roomId ? { ...state.dmRoom, ...(updates as any) } : state.dmRoom,
    })),
}));
