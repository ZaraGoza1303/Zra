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

export interface RoomResponse {
    id: string;
    owner_id: number;
    picture?: string;
    name: string;
    description?: string;
    room_link: string;
    created_at: string;
    updated_at: string;
}

export interface Room {
    id: string;
    name: string;
    picture: string | null;
    owner_id: number;
    description?: string;
}
