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
    caption?: string;
    edited_message_id?: string;
    reply_to_id?: string;
    reply_to?: Message;
    time_stamp: string;
}

export interface LastMessage {
    content: string;
    username: string;
    sent_at: string;
    type?: string;
    caption?: string;
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
    onOpenDM?: (roomId: string, targetName: string, targetPicture?: string, targetUserId?: number) => void;
    onlineUserIds?: Set<number>;
    /** When opening a pending DM, pass partner info so online status shows immediately */
    privatePartnerInfo?: {
        user_id: number;
        username: string;
        user_profile_picture?: string;
        user_bio?: string;
    };
}

export interface RoomMember {
    user_id: number;
    user_profile_picture?: string;
    username: string;
    user_bio?: string;
    role?: string;
    is_verified?: boolean;
    created_at?: string;
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
    provider?: string;
    created_at?: string;
}

export interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface UserProfile {
    id: number;
    name: string;
    username: string;
    bio: string;
    email: string;
    profile_picture?: string;
    is_verified?: boolean;
    created_at?: string;
}

export type SocialPlatform = 'youtube' | 'instagram' | 'github' | 'reddit';

export interface SocialLink {
    id: number;
    type: SocialPlatform;
    url: string;
}
