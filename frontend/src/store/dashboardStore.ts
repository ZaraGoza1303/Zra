// src/store/dashboardStore.ts
import { create } from 'zustand';
import type { Room } from '../types/chat';

type NavItem = 'home' | 'rooms' | 'chats' | 'contacts' | 'settings';

interface DashboardState {
    rooms: Room[];
    selectedRoom: Room | null;
    dmRoom: { id: string; name: string; picture?: string } | null;
    searchTerm: string;
    activeNav: NavItem;
    isModalOpen: boolean;
    isProfileModalOpen: boolean;
    setRooms: (rooms: Room[]) => void;
    setSelectedRoom: (room: Room | null) => void;
    setDmRoom: (dmRoom: { id: string; name: string; picture?: string } | null) => void;
    setSearchTerm: (term: string) => void;
    setActiveNav: (nav: NavItem) => void;
    setIsModalOpen: (isOpen: boolean) => void;
    setIsProfileModalOpen: (isOpen: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    rooms: [],
    selectedRoom: null,
    dmRoom: null,
    searchTerm: '',
    activeNav: 'home',
    isModalOpen: false,
    isProfileModalOpen: false,

    setRooms: (rooms) => set({ rooms }),
    setSelectedRoom: (selectedRoom) => set({ selectedRoom, dmRoom: null }),
    setDmRoom: (dmRoom) => set({ dmRoom, selectedRoom: null }),
    setSearchTerm: (searchTerm) => set({ searchTerm }),
    setActiveNav: (activeNav) => set({ activeNav }),
    setIsModalOpen: (isModalOpen) => set({ isModalOpen }),
    setIsProfileModalOpen: (isProfileModalOpen) => set({ isProfileModalOpen }),
}));
