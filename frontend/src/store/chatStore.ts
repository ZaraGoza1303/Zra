// src/store/chatStore.ts
import { create } from 'zustand';
import type { Message, RoomMember, RoomResponse, UserProfile, SocialLink } from '../types/chat';

interface ChatState {
    messages: Message[];
    input: string;
    replyTo: Message | null;
    roomMembers: RoomMember[];
    totalMemberCount: number | null;
    activeMemberCount: number | null;
    roomDetails: RoomResponse | null;
    friendsList: UserProfile[];
    fetchingMembers: boolean;
    fetchingInfo: boolean;
    fetchingHistory: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    showUsersModal: boolean;
    showInfoModal: boolean;
    targetUserId: number | null;
    actionLoading: boolean;
    addingMember: boolean;
    activeMembers: number[];
    typingUsers: Record<string, Record<number, string>>;

    // Edit states
    editingName: boolean;
    editingDesc: boolean;
    editName: string;
    editDesc: string;
    editLoading: boolean;
    previewPicture: { file: File; url: string } | null;
    privatePartner: {
        username: string;
        name?: string;
        user_bio?: string;
        user_profile_picture?: string;
        user_id: number;
        is_verified?: boolean;
        created_at?: string;
        social_links?: SocialLink[];
    } | null;

    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
    setReplyTo: (msg: Message | null) => void;
    setInput: (input: string) => void;
    setRoomMembers: (roomMembers: RoomMember[]) => void;
    setTotalMemberCount: (count: number | null) => void;
    setActiveMemberCount: (count: number | null) => void;
    setRoomDetails: (details: RoomResponse | null) => void;
    setFriendsList: (friends: UserProfile[]) => void;
    setFetchingMembers: (isFetching: boolean) => void;
    setFetchingInfo: (isFetching: boolean) => void;
    setFetchingHistory: (isFetching: boolean) => void;
    setHasMore: (hasMore: boolean) => void;
    setLoadingMore: (isLoading: boolean) => void;
    setTargetUserId: (id: number | null) => void;
    setActionLoading: (isLoading: boolean) => void;
    setAddingMember: (isAdding: boolean) => void;
    setShowUsersModal: (show: boolean) => void;
    setShowInfoModal: (show: boolean) => void;
    setActiveMembers: (ids: number[]) => void;
    setTyping: (roomId: string, userId: number, username: string, isTyping: boolean) => void;

    // Edit setters
    setEditingName: (val: boolean) => void;
    setEditingDesc: (val: boolean) => void;
    setEditName: (val: string) => void;
    setEditDesc: (val: string) => void;
    setEditLoading: (val: boolean) => void;
    setPreviewPicture: (val: { file: File; url: string } | null) => void;
    setPrivatePartner: (partner: {
        username: string;
        name?: string;
        user_bio?: string;
        user_profile_picture?: string;
        user_id: number;
        is_verified?: boolean;
        created_at?: string;
        social_links?: SocialLink[];
    } | null) => void;

    mutualRooms: { id: string; name: string; picture?: string }[];
    setMutualRooms: (rooms: { id: string; name: string; picture?: string }[]) => void;

    resetChatState: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    input: '',
    replyTo: null,
    roomMembers: [],
    totalMemberCount: null,
    activeMemberCount: null,
    roomDetails: null,
    friendsList: [],
    fetchingMembers: false,
    fetchingInfo: false,
    fetchingHistory: false,
    hasMore: true,
    loadingMore: false,
    showUsersModal: false,
    showInfoModal: false,
    targetUserId: null,
    actionLoading: false,
    addingMember: false,
    activeMembers: [],
    mutualRooms: [],
    typingUsers: {},

    editingName: false,
    editingDesc: false,
    editName: '',
    editDesc: '',
    editLoading: false,
    previewPicture: null,
    privatePartner: null,

    setMessages: (messagesOrFn) =>
        set((state) => ({
            messages: typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn
        })),
    setReplyTo: (replyTo) => set({ replyTo }),
    setInput: (input) => set({ input }),
    setRoomMembers: (roomMembers) => set({ roomMembers }),
    setTotalMemberCount: (totalMemberCount) => set({ totalMemberCount }),
    setActiveMemberCount: (activeMemberCount) => set({ activeMemberCount }),
    setRoomDetails: (roomDetails) => set({ roomDetails }),
    setFriendsList: (friendsList) => set({ friendsList }),
    setFetchingMembers: (fetchingMembers) => set({ fetchingMembers }),
    setFetchingInfo: (fetchingInfo) => set({ fetchingInfo }),
    setFetchingHistory: (fetchingHistory) => set({ fetchingHistory }),
    setHasMore: (hasMore) => set({ hasMore }),
    setLoadingMore: (loadingMore) => set({ loadingMore }),
    setTargetUserId: (targetUserId) => set({ targetUserId }),
    setActionLoading: (actionLoading) => set({ actionLoading }),
    setAddingMember: (addingMember) => set({ addingMember }),
    setShowUsersModal: (showUsersModal) => set({ showUsersModal }),
    setShowInfoModal: (showInfoModal) => set({ showInfoModal }),
    setActiveMembers: (ids: number[]) => set({ activeMembers: ids }),
    setMutualRooms: (mutualRooms) => set({ mutualRooms }),
    setTyping: (roomId, userId, username, isTyping) => set((state) => {
        const roomTyping = { ...(state.typingUsers[roomId] || {}) };

        if (isTyping) {
            roomTyping[userId] = username;
        } else {
            delete roomTyping[userId];
        }

        return {
            typingUsers: {
                ...state.typingUsers,
                [roomId]: roomTyping
            }
        };
    }),


    setEditingName: (editingName) => set({ editingName }),
    setEditingDesc: (editingDesc) => set({ editingDesc }),
    setEditName: (editName) => set({ editName }),
    setEditDesc: (editDesc) => set({ editDesc }),
    setEditLoading: (editLoading) => set({ editLoading }),
    setPreviewPicture: (previewPicture) => set({ previewPicture }),
    setPrivatePartner: (privatePartner) => set({ privatePartner }),

    resetChatState: () => set({
        messages: [],
        input: '',
        replyTo: null,
        roomMembers: [],
        totalMemberCount: null,
        activeMemberCount: null,
        roomDetails: null,
        friendsList: [],
        fetchingMembers: false,
        fetchingInfo: false,
        fetchingHistory: false,
        hasMore: true,
        loadingMore: false,
        showUsersModal: false,
        showInfoModal: false,
        targetUserId: null,
        actionLoading: false,
        addingMember: false,
        activeMembers: [],
        editingName: false,
        editingDesc: false,
        editName: '',
        editDesc: '',
        editLoading: false,
        previewPicture: null,
        privatePartner: null,
        mutualRooms: []
    }),
}));
