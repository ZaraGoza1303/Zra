export interface SearchedUser {
    id: number;
    username: string;
    name: string;
    bio?: string;
    profile_picture?: string;
    friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'friend';
}

export interface FriendRequest {
    id: number;
    username: string;
    name: string;
    bio?: string;
    profile_picture?: string;
}

export type ActiveTab = 'search' | 'requests' | 'friends';

export type FriendAction = 'add' | 'cancel' | 'approve' | 'reject';

export interface UserDetailDrawerProps {
    user: SearchedUser;
    onClose: () => void;
    onFriendAction: (userId: number, action: FriendAction) => void;
    onDirectMessage: (userId: number, user?: SearchedUser) => void;
    onUnfriend: (userId: number) => void;
    actionLoading: number | null;
    dmLoading: boolean;
}

export interface ContactsPanelProps {
    isVisible: boolean;
    onOpenDM: (roomId: string, targetName: string, targetPicture?: string, targetUserId?: number) => void;
    friendRequestNotif?: number;
    friendAcceptedNotif?: number;
    onRequestTabOpen?: () => void;
    onFriendsTabOpen?: () => void;
    onlineUserIds?: Set<number>;
}

export type UnreadNotif = { type: string; count: number };