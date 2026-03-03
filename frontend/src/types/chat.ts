// src/types/chat.ts

export interface Message {
    id: string;
    room_id: string;
    user_id: number;
    username: string;
    type: string;
    content: string;
    timestamp: string;
}

export interface ChatRoomProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    onBack?: () => void;
}

export interface RoomMember {
    user_id: number;
    user_profile_picture?: string;
    username: string;
    user_bio?: string;
    role: string;
}

export interface Room {
    id: string;
    name: string;
    picture: string | null;
    owner_id?: number;
    description?: string;
    room_link?: string;
    created_at?: string;
    updated_at?: string;
}

// Keeping RoomResponse and RoomDetail for now as aliases or updated versions of Room
export type RoomResponse = Room;
export type RoomDetail = Room;

export interface User {
    id: number;
    email: string;
    name: string;
    bio: string;
    profile_picture?: string;
    refresh_token?: string;
}

export interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface UserProfile {
    id: number;
    name: string;
    bio: string;
    email: string;
    profile_picture?: string;
}
