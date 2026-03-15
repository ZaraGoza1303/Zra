// src/types/chat.ts

export type MessageStatus = 'pending' | 'sent' | 'read' | 'failed';

export interface Message {
    id: string;
    local_id?: string;
    room_id: string;
    user_id?: number;
    username: string;
    profile_picture?: string;
    type: string;
    content: string;
    status?: MessageStatus;
    is_read?: boolean;
    reply_to_id?: string;
    reply_to?: Message;
    time_stamp: string;
}

export interface LastMessage {
    content: string;
    username: string;
    sent_at: string;
}

export interface ChatRoomProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    roomType?: 'group' | 'private';
    onBack?: () => void;
    onNewMessage?: (roomId: string, message: LastMessage) => void;
    onRoomResolved?: (resolvedRoomId: string) => void;
    onStartCall?: (withVideo: boolean) => void;
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
    type?: 'group' | 'private';
    members?: RoomMemberResponse[];
    created_at?: string;
    updated_at?: string;
    last_message?: LastMessage;
    unread_message?: number;
}

export interface RoomMemberResponse {
    user_id: number;
    user_profile_picture?: string;
    username: string;
    user_bio: string;
}

// Keeping RoomResponse and RoomDetail for now as aliases or updated versions of Room
export type RoomResponse = Room;
export type RoomDetail = Room;

export interface User {
    id: number;
    email: string;
    name: string;
    username: string;
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
