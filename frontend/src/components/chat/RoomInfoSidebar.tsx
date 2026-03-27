import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Users, Pencil, UserPlus, AlertTriangle, LogOut, Copy, MessageCircle, MoreVertical, Eye, UserMinus, Shield, ChevronRight } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { FRONTEND_JOIN_URL } from '../../config';
import { getUserImageUrl, getRoomImageUrl } from '../../utils/imageUtils';
import { getBlockedUsers } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { apiCall } from '../../services/api';
import ConfirmDialog from '../ui/ConfirmDialog';
import ImageCropModal from '../ImageCropModal';
import UserDetailModal from '../contact/UserDetailModal';
import SharedImagesGallery from './SharedImagesGallery';


interface MediaMessage {
    id: string;
    content: string;
    time_stamp: string;
    username: string;
}

interface RoomInfoSidebarProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    isAdmin: boolean;
    pictureInputRef: React.RefObject<HTMLInputElement | null>;
    handleUpdateRoom: (field: 'name' | 'description' | 'picture', value?: string | File) => Promise<void>;
    handleRoomAction: (action: 'leave' | 'kick' | 'admin' | 'demote' | 'delete') => Promise<void>;
    onClose: () => void;
    onAddMember: (userId: number) => Promise<void>;
    onBack?: () => void;
    onRefresh: () => Promise<void>;
    roomType?: 'group' | 'private';
    onlineUserIds?: Set<number>;
    onOpenDM?: (roomId: string, targetName: string, targetPicture?: string, targetUserId?: number) => void;
}

export default function RoomInfoSidebar({
    roomId,
    roomName,
    roomPicture,
    isAdmin,
    pictureInputRef,
    handleUpdateRoom,
    handleRoomAction,
    onClose,
    onAddMember,
    onRefresh,
    roomType,
    onlineUserIds,
    onOpenDM
}: RoomInfoSidebarProps) {
    const [showAddMember, setShowAddMember] = useState(false);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [sharedImages, setSharedImages] = useState<MediaMessage[]>([]);
    const [totalImageCount, setTotalImageCount] = useState(0);
    const [showGallery, setShowGallery] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{
        user_id: number;
        username: string;
        user_profile_picture?: string;
        user_bio?: string;
        role: string;
    } | null>(null);
    const { user } = useAuthStore();
    const {
        fetchingInfo,
        fetchingMembers,
        privatePartner,
        roomDetails,
        roomMembers,
        totalMemberCount,
        actionLoading,
        editingName, setEditingName,
        editingDesc, setEditingDesc,
        editName, setEditName,
        editDesc, setEditDesc,
        editLoading,
        friendsList,
        addingMember,
        activeMembers,
        mutualRooms,
        setTargetUserId
    } = useChatStore();

    const withRefresh = async (fn: () => Promise<void>) => {
        await fn();
        await onRefresh();
    };

    const isPrivate = roomType === 'private';
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmUnfriend, setConfirmUnfriend] = useState(false);
    const [confirmBlock, setConfirmBlock] = useState(false);
    const [confirmUnblock, setConfirmUnblock] = useState(false);
    const [confirmAddFriend, setConfirmAddFriend] = useState(false);
    const [confirmCancelRequest, setConfirmCancelRequest] = useState(false);
    const [loadingUnfriend, setLoadingUnfriend] = useState(false);
    const [loadingBlock, setLoadingBlock] = useState(false);
    const [loadingUnblock, setLoadingUnblock] = useState(false);
    const [loadingAddFriend, setLoadingAddFriend] = useState(false);
    const [loadingCancelRequest, setLoadingCancelRequest] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState<'friend' | 'pending_sent' | 'pending_received' | 'none'>('none');
    const { showToast } = useToastStore();


    useEffect(() => {
        let cancelled = false;
        const checkBlockedStatus = async () => {
            if (isPrivate && privatePartner?.user_id) {
                try {
                    const res = await getBlockedUsers();
                    if (!cancelled && res?.data) {
                        setIsBlocked(res.data.some(b => b.id === privatePartner.user_id));
                    }
                } catch (err) {
                    console.error('Failed to check blocked status:', err);
                }
            }
        };
        setIsBlocked(false); // reset dulu sebelum fetch
        checkBlockedStatus();
        return () => { cancelled = true; };
    }, [isPrivate, privatePartner?.user_id, roomId]);

    useEffect(() => {
        const checkFriendshipStatus = async () => {
            if (isPrivate && privatePartner?.user_id) {
                try {
                    const res = await apiCall<{ data: { status: 'friend' | 'pending_sent' | 'pending_received' | 'none' } }>(
                        `/user/friendship-status/${privatePartner.user_id}`,
                        { method: 'GET' }
                    );
                    setFriendshipStatus(res.data.status);
                } catch (err) {
                    console.error('Failed to check friendship status:', err);
                }
            }
        };
        checkFriendshipStatus();
    }, [isPrivate, privatePartner?.user_id]);

    // Fetch preview images (first ~20 to know real total) — runs for both private and group
    const fetchPreviewImages = useCallback(async (rid: string) => {
        if (!rid) return;
        try {
            const res = await apiCall<{ data: { message: MediaMessage[]; next_cursor?: string } }>(`/room/${rid}/media`, { method: 'GET' });
            const data = res.data?.message || [];
            setSharedImages(data.slice(0, 6));
            setTotalImageCount(data.length);
        } catch (err) {
            console.error('Failed to fetch preview images:', err);
        }
    }, []);

    // Trigger preview fetch whenever roomId prop changes
    useEffect(() => {
        if (roomId) {
            fetchPreviewImages(roomId);
        }
    }, [roomId, fetchPreviewImages]);

    const handleBlock = async (targetId: number) => {
        try {
            await apiCall(`/user/block/${targetId}`, { method: 'POST' });
            showToast('User blocked');
            setIsBlocked(true);
            setSelectedMember(null);
        } catch (err: any) {
            if (err.message === 'user already blocked') {
                setIsBlocked(true);
                showToast('User is already blocked');
            } else {
                showToast(err.message || 'Failed to block user', 'error');
            }
        }
    };

    const handleUnblock = async (targetId: number) => {
        try {
            await apiCall(`/user/block/${targetId}`, { method: 'DELETE' });
            showToast('User unblocked');
            setIsBlocked(false);
            setSelectedMember(null);
        } catch (err: any) {
            showToast(err.message || 'Failed to unblock user', 'error');
        }
    };

    const handleAddFriend = async (targetId: number) => {
        try {
            await apiCall(`/user/make-friend-requests/${targetId}`, { method: 'POST' });
            showToast('Friend request sent');
            setFriendshipStatus('pending_sent');
        } catch (err: any) {
            showToast(err.message || 'Failed to send friend request', 'error');
        }
    };

    const handleUnfriend = async (targetId: number) => {
        try {
            await apiCall(`/user/unfriend/${targetId}`, { method: 'DELETE' });
            showToast('User unfriended');
            setFriendshipStatus('none');
            await onRefresh();
        } catch (err: any) {
            showToast(err.message || 'Failed to unfriend', 'error');
        }
    };

    const handleCancelRequest = async (targetId: number) => {
        try {
            await apiCall(`/user/cancel-friend-request/${targetId}`, { method: 'DELETE' });
            showToast('Friend request cancelled');
            setFriendshipStatus('none');
        } catch (err: any) {
            showToast(err.message || 'Failed to cancel request', 'error');
        }
    };

    const handleAcceptRequest = async (targetId: number) => {
        try {
            await apiCall(`/user/accept-friend-requests/${targetId}`, { method: 'PUT' });
            showToast('Friend request accepted');
            setFriendshipStatus('friend');
            await onRefresh();
        } catch (err: any) {
            showToast(err.message || 'Failed to accept request', 'error');
        }
    };

    return (
        <div className="w-[340px] shrink-0 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] shrink-0">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{isPrivate ? 'User Info' : 'Group Info'}</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <X size={20} />
                </button>
            </div>

            {isPrivate ? (
                <div className="flex flex-col h-full gap-4 items-center px-5 pt-8 pb-6 shrink-0">
                    {fetchingInfo ? (
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-4">
                            <div className="w-5 h-5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : privatePartner ? (
                        <>
                            {/* Avatar */}
                            <div className="relative w-[100px] h-[100px] mb-2">
                                <div className="w-full h-full rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden shadow-xl border border-[var(--border-color)]">
                                    {privatePartner.user_profile_picture ? (
                                        <img src={getUserImageUrl(privatePartner.user_profile_picture)} alt={privatePartner.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-[var(--text-muted)]" />
                                    )}
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{privatePartner.username}</h2>
                                </div>
                                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                                    {onlineUserIds?.has(privatePartner.user_id) ? (
                                        <span className="text-green-400">● Online</span>
                                    ) : (
                                        <span>● Offline</span>
                                    )}
                                </p>
                            </div>

                            {privatePartner.user_bio && (
                                <div className="w-full bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-2">Bio</p>
                                    <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{privatePartner.user_bio}</p>
                                </div>
                            )}

                            {privatePartner.social_links && privatePartner.social_links.length > 0 && (
                                <div className="w-full mt-4 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3">Socials</p>
                                    <div className="flex flex-col gap-1">
                                        {privatePartner.social_links.map(link => {
                                            const getPlatformName = (type: string) => {
                                                switch (type) {
                                                    case 'youtube': return 'YouTube';
                                                    case 'instagram': return 'Instagram';
                                                    case 'github': return 'GitHub';
                                                    case 'reddit': return 'Reddit';
                                                    default: return type;
                                                }
                                            };
                                            const getUsernameFromUrl = (url: string, type: string): string => {
                                                try {
                                                    const urlObj = new URL(url);
                                                    const pathname = urlObj.pathname;
                                                    switch (type) {
                                                        case 'youtube': return pathname.replace('/@', '') || urlObj.searchParams.get('username') || 'YouTube';
                                                        case 'instagram': return pathname.replace('/', '') || 'Instagram';
                                                        case 'github': return pathname.replace('/', '') || 'GitHub';
                                                        case 'reddit': return pathname.replace('/u/', '').replace('/user/', '') || 'Reddit';
                                                        default: return url;
                                                    }
                                                } catch { return url; }
                                            };
                                            const platformIcon = (type: string, className: string) => {
                                                switch (type) {
                                                    case 'youtube':
                                                        return (
                                                            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                                            </svg>
                                                        );
                                                    case 'instagram':
                                                        return (
                                                            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                            </svg>
                                                        );
                                                    case 'github':
                                                        return (
                                                            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                            </svg>
                                                        );
                                                    case 'reddit':
                                                        return (
                                                            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.249-1.249zm-5.428 3.629a1.561 1.561 0 0 1-1.33-1.56 1.561 1.561 0 0 1 1.33-1.56 1.561 1.561 0 0 1 1.33 1.56 1.561 1.561 0 0 1-1.33 1.56zm7.424 0a1.561 1.561 0 0 1-1.33-1.56 1.561 1.561 0 0 1 1.33-1.56 1.561 1.561 0 0 1 1.33 1.56 1.561 1.561 0 0 1-1.33 1.56z" />
                                                            </svg>
                                                        );
                                                    default:
                                                        return <MessageCircle className={className} />;
                                                }
                                            };
                                            const iconColor = link.type === 'youtube' ? 'text-red-500' :
                                                link.type === 'instagram' ? 'text-pink-500' :
                                                    link.type === 'github' ? 'text-[var(--text-primary)]' :
                                                        link.type === 'reddit' ? 'text-orange-500' : 'text-[var(--text-muted)]';
                                            return (
                                                <a
                                                    key={link.id}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 -mx-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
                                                >
                                                    <div className="w-6 h-6 flex items-center justify-center">
                                                        {platformIcon(link.type, `w-5 h-5 ${iconColor}`)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-[var(--text-primary)]">{getPlatformName(link.type)}</span>
                                                        <span className="text-xs text-[var(--text-muted)]">@{getUsernameFromUrl(link.url, link.type)}</span>
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Shared Images */}
                            {sharedImages.length > 0 && (
                                <div className="w-full mt-4 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-[var(--accent-color)] tracking-widest uppercase mb-0.5">Gallery</p>
                                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Shared Images</p>
                                        </div>
                                        <button
                                            onClick={() => setShowGallery(true)}
                                            className="flex items-center gap-0.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors font-medium"
                                        >
                                            View All <ChevronRight size={13} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {sharedImages.slice(0, 5).map((img) => (
                                            <button
                                                key={img.id}
                                                onClick={() => setShowGallery(true)}
                                                className="aspect-square rounded-md overflow-hidden bg-[var(--bg-tertiary)] hover:opacity-85 active:scale-95 transition-all duration-150 focus:outline-none"
                                            >
                                                <img
                                                    src={getRoomImageUrl(img.content)}
                                                    alt="shared"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </button>
                                        ))}
                                        {sharedImages.length >= 6 && (
                                            <button
                                                onClick={() => setShowGallery(true)}
                                                className="aspect-square rounded-md overflow-hidden bg-[var(--bg-tertiary)] hover:opacity-85 active:scale-95 transition-all duration-150 focus:outline-none relative"
                                            >
                                                <img
                                                    src={getRoomImageUrl(sharedImages[5].content)}
                                                    alt="shared"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                                {totalImageCount > 6 && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md">
                                                        <span className="text-white text-[14px] font-bold">+{totalImageCount - 5}</span>
                                                    </div>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}



                            {mutualRooms.length > 0 && (
                                <div className="w-full mt-3 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <p className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3">
                                        {mutualRooms.length} Mutual Room{mutualRooms.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {mutualRooms.map(room => (
                                            <div key={room.id} className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden shrink-0 flex items-center justify-center">
                                                    {room.picture ? (
                                                        <img src={getRoomImageUrl(room.picture)} alt={room.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={14} className="text-[var(--text-muted)]" />
                                                    )}
                                                </div>
                                                <span className="text-[13px] text-[var(--text-primary)] truncate">{room.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="w-full mt-4">
                                {friendshipStatus === 'friend' && (
                                    <button
                                        onClick={() => privatePartner && setConfirmUnfriend(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl text-xs font-medium text-orange-400 hover:bg-orange-500/10 border border-orange-500/20 transition-colors"
                                    >
                                        <UserMinus size={14} />
                                        Unfriend
                                    </button>
                                )}
                                {friendshipStatus === 'pending_sent' && (
                                    <button
                                        onClick={() => privatePartner && setConfirmCancelRequest(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl text-xs font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
                                    >
                                        <UserMinus size={14} />
                                        Cancel Request
                                    </button>
                                )}
                                {friendshipStatus === 'pending_received' && (
                                    <button
                                        onClick={() => privatePartner && handleAcceptRequest(privatePartner.user_id)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                                    >
                                        <UserPlus size={14} />
                                        Accept Request
                                    </button>
                                )}
                                {friendshipStatus === 'none' && (
                                    <button
                                        onClick={() => privatePartner && setConfirmAddFriend(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/40 transition-colors"
                                    >
                                        <UserPlus size={14} />
                                        Add Friend
                                    </button>
                                )}
                                {isBlocked ? (
                                    <button
                                        onClick={() => privatePartner && setConfirmUnblock(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/40 transition-colors"
                                    >
                                        <Shield size={14} />
                                        Unblock User
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => privatePartner && setConfirmBlock(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/15 border border-red-500/40 transition-colors"
                                    >
                                        <Shield size={14} />
                                        Block User
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-[var(--text-muted)] py-4 text-center">Failed to load profile.</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-[var(--border-color)] shrink-0">

                        <div className="relative w-[104px] h-[104px] group/avatar mb-4">
                            <div className="w-full h-full rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden shadow-xl border border-[var(--border-color)]">
                                {roomDetails?.picture || roomPicture ? (
                                    <img src={getRoomImageUrl(roomDetails?.picture || roomPicture)} alt={roomName} className="w-full h-full object-cover" />
                                ) : (
                                    <Users size={40} className="text-[var(--text-muted)]" />
                                )}
                            </div>
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => pictureInputRef.current?.click()}
                                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                    >
                                        <Pencil size={20} className="text-white" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={pictureInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setCropFile(file);
                                                // Reset input value biar onChange bisa trigger lagi
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        {/* Name edit */}
                        {editingName ? (
                            <div className="flex items-center gap-2 mb-1.5">
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="bg-[var(--bg-primary)] border border-[var(--accent-color)]/50 rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-[15px] font-bold outline-none"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') withRefresh(() => handleUpdateRoom('name', editName));
                                        if (e.key === 'Escape') setEditingName(false);
                                    }}
                                />
                                <button
                                    onClick={() => withRefresh(() => handleUpdateRoom('name', editName))}
                                    disabled={editLoading}
                                    className="text-[var(--accent-color)] hover:text-[var(--accent-color)] text-xs font-medium"
                                >
                                    {editLoading ? '...' : 'Save'}
                                </button>
                                <button onClick={() => setEditingName(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-1.5">
                                <h2 className="text-[19px] font-bold text-[var(--text-primary)]">{roomDetails?.name || roomName}</h2>
                                {isAdmin && (
                                    <button
                                        onClick={() => { setEditName(roomDetails?.name || roomName); setEditingName(true); }}
                                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                        <p className="text-[13px] text-[var(--text-muted)]">
                            {totalMemberCount !== null ? `${totalMemberCount} members` : 'Loading...'}
                        </p>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col p-6 border-b border-[var(--border-color)] shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[11px] font-bold text-[var(--text-muted)] tracking-[0.1em] uppercase">Description</h3>
                            {isAdmin && !editingDesc && (
                                <button
                                    onClick={() => { setEditDesc(roomDetails?.description || ''); setEditingDesc(true); }}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                        {editingDesc ? (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    autoFocus
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    rows={3}
                                    className="bg-[var(--bg-primary)] border border-[var(--accent-color)]/50 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[14px] outline-none resize-none font-[inherit]"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => withRefresh(() => handleUpdateRoom('description', editDesc))}
                                        disabled={editLoading}
                                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color)] disabled:opacity-50 transition-colors"
                                    >
                                        {editLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setEditingDesc(false)}
                                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                                {roomDetails?.description || <span className="text-[var(--text-muted)] italic">No description yet.</span>}
                            </p>
                        )}
                    </div>

                    {/* Members List */}
                    <div className="flex flex-col p-6 border-b border-[var(--border-color)] shrink-0">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[11px] font-bold text-[var(--text-muted)] tracking-[0.1em] uppercase">Members</h3>
                            <span className="bg-[var(--border-color)] text-[var(--text-muted)] text-[11px] px-2.5 py-0.5 rounded-md font-medium">{roomMembers.length}</span>
                        </div>

                        <div className="flex flex-col gap-4">
                            {fetchingMembers ? (
                                <div className="flex justify-center text-[var(--text-muted)]">
                                    <div className="w-5 h-5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : roomMembers.map(member => {
                                const isOnline = activeMembers.includes(member.user_id);
                                const isSelf = member.user_id === user?.id;
                                const canShowMenu = !isSelf && member.role !== 'owner';
                                const canPerformActions = isAdmin && member.role !== 'owner';

                                return (
                                    <div key={member.user_id} className="flex items-center justify-between relative">
                                        <div className="flex items-center gap-3.5">
                                            <div className="relative">
                                                <div className="w-[42px] h-[42px] rounded-full overflow-hidden">
                                                    {member.user_profile_picture ? (
                                                        <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] font-bold text-[15px]">
                                                            <User size={18} strokeWidth={2} />
                                                        </div>
                                                    )}
                                                </div>
                                                {isOnline && (
                                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[15px] font-medium text-[var(--text-primary)] leading-tight mb-0.5">
                                                    {member.username}
                                                </span>
                                                {member.user_bio && (
                                                    <span className="text-[12px] text-[var(--text-muted)] truncate max-w-[160px]">
                                                        {member.user_bio}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.role === 'admin' && (
                                                <span className="text-[11px] text-[var(--text-muted)] bg-[var(--border-color)] px-2 py-1 rounded-[6px] font-medium">Admin</span>
                                            )}
                                            {canShowMenu && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === member.user_id ? null : member.user_id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                    {openMenuId === member.user_id && (
                                                        <div className="absolute right-0 top-8 w-40 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl shadow-xl z-20 py-1 animate-in fade-in duration-100">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedMember({
                                                                        ...member,
                                                                        role: member.role || 'member'
                                                                    });
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                                            >
                                                                <Eye size={14} /> View Profile
                                                            </button>
                                                            {canPerformActions && member.role === 'member' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setTargetUserId(member.user_id);
                                                                        handleRoomAction('admin');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                                                >
                                                                    <Shield size={14} /> Make Admin
                                                                </button>
                                                            )}
                                                            {canPerformActions && member.role === 'admin' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setTargetUserId(member.user_id);
                                                                        handleRoomAction('demote');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                                                >
                                                                    <Shield size={14} /> Remove Admin
                                                                </button>
                                                            )}
                                                            {canPerformActions && (
                                                                <button
                                                                    onClick={() => {
                                                                        setTargetUserId(member.user_id);
                                                                        handleRoomAction('kick');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                                >
                                                                    <UserMinus size={14} /> Kick
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowAddMember(true)}
                            className="mt-6 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-[var(--text-muted)] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/5 hover:text-[var(--text-primary)] hover:border-white/30 transition-all"
                        >
                            <UserPlus size={18} /> Add Member
                        </button>

                        {/* Add Member Modal */}
                        {showAddMember && (
                            <div
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                                onClick={() => setShowAddMember(false)}
                            >
                                <div
                                    className="w-full max-w-[360px] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-2xl"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Member</h3>
                                        <button onClick={() => setShowAddMember(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto p-3">
                                        {friendsList.length === 0 ? (
                                            <div className="text-center py-8 text-[var(--text-muted)] text-sm">No friends to add.</div>
                                        ) : friendsList
                                            .filter(f => !roomMembers.some(m => m.user_id === f.id))
                                            .map(friend => (
                                                <div key={friend.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                                                            {friend.profile_picture ? (
                                                                <img src={getUserImageUrl(friend.profile_picture)} alt={friend.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={18} strokeWidth={2} className="text-[#cdd9f0]" />
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-[var(--text-primary)]">{friend.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={async () => { await withRefresh(() => onAddMember(friend.id)); }}
                                                        disabled={addingMember}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color)] disabled:opacity-50 transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))
                                        }
                                        {friendsList.length > 0 && friendsList.filter(f => !roomMembers.some(m => m.user_id === f.id)).length === 0 && (
                                            <div className="text-center py-8 text-[var(--text-muted)] text-sm">All friends are already members.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shared Photos */}
                    {sharedImages.length > 0 && (
                        <div className="flex flex-col p-6 border-b border-[var(--border-color)] shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--accent-color)] tracking-widest uppercase mb-0.5">Gallery</p>
                                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Shared Photos</h3>
                                </div>
                                <button
                                    onClick={() => setShowGallery(true)}
                                    className="flex items-center gap-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors font-medium"
                                >
                                    View All <ChevronRight size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {sharedImages.slice(0, 5).map((img) => (
                                    <button
                                        key={img.id}
                                        onClick={() => setShowGallery(true)}
                                        className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] hover:opacity-85 active:scale-95 transition-all duration-150 focus:outline-none"
                                    >
                                        <img
                                            src={getRoomImageUrl(img.content)}
                                            alt="shared"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                                {/* overflow counter or last image */}
                                {sharedImages.length >= 6 && (
                                    <button
                                        onClick={() => setShowGallery(true)}
                                        className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] hover:opacity-85 active:scale-95 transition-all duration-150 focus:outline-none relative"
                                    >
                                        <img
                                            src={getRoomImageUrl(sharedImages[5].content)}
                                            alt="shared"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {totalImageCount > 6 && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                                <span className="text-white text-[15px] font-bold">+{totalImageCount - 5}</span>
                                            </div>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Room Link */}
                    <div className="flex flex-col p-6 border-b border-[var(--border-color)] shrink-0">
                        <h3 className="text-[11px] font-bold text-[var(--text-muted)] tracking-[0.1em] uppercase mb-4">Room Link</h3>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-xl text-[13px] text-[var(--text-muted)] truncate">
                                {roomDetails?.room_link ? `${FRONTEND_JOIN_URL}/${roomDetails.room_link}` : '-'}
                            </div>
                            <button
                                onClick={() => {
                                    if (roomDetails?.room_link) {
                                        navigator.clipboard.writeText(`${FRONTEND_JOIN_URL}/${roomDetails.room_link}`);
                                        showToast('Room link copied!');
                                    }
                                }}
                                className="w-10 h-10 shrink-0 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-color)] flex items-center justify-center transition-colors"
                            >
                                <Copy size={16} className="text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="flex flex-col p-6 shrink-0">
                        <h3 className="text-[11px] font-bold text-[var(--text-muted)] tracking-[0.1em] uppercase mb-8">Options</h3>
                        <div className="flex flex-col gap-1">
                            <button onClick={() => setConfirmLeave(true)} disabled={actionLoading} className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all disabled:opacity-50">
                                <LogOut size={18} /> Leave Group
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    disabled={actionLoading}
                                    className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all disabled:opacity-50 mt-1"
                                >
                                    <AlertTriangle size={18} /> Delete Room
                                </button>
                            )}

                        </div>
                    </div>
                </>
            )}

            {showGallery && roomId && (
                <SharedImagesGallery
                    roomId={roomId}
                    onClose={() => setShowGallery(false)}
                />
            )}

            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onConfirm={async (croppedFile) => {
                        setCropFile(null);
                        await withRefresh(() => handleUpdateRoom('picture', croppedFile));
                    }}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {selectedMember && (
                <UserDetailModal
                    user={{
                        id: selectedMember.user_id,
                        username: selectedMember.username,
                        name: selectedMember.username,
                        profile_picture: selectedMember.user_profile_picture,
                        bio: selectedMember.user_bio,
                        friendship_status: 'friend'
                    }}
                    onClose={() => setSelectedMember(null)}
                    onDirectMessage={(targetId, targetUser) => {
                        setSelectedMember(null);
                        onClose();
                        onOpenDM?.(
                            `pending:${targetId}`,
                            targetUser.username,
                            targetUser.profile_picture,
                            targetId
                        );
                    }}
                />
            )}

            <ConfirmDialog
                isOpen={confirmLeave}
                title="Leave Room"
                description="Are you sure you want to leave this group?"
                confirmLabel="Leave Room"
                cancelLabel="Cancel"
                variant="danger"
                loading={actionLoading}
                onConfirm={async () => { await handleRoomAction('leave'); setConfirmLeave(false); }}
                onCancel={() => setConfirmLeave(false)}
            />
            <ConfirmDialog
                isOpen={confirmDelete}
                title="Delete Room"
                description="Are you sure you want to delete this room? All messages and members will be permanently removed. This action cannot be undone."
                confirmLabel="Delete Room"
                cancelLabel="Cancel"
                variant="danger"
                loading={actionLoading}
                onConfirm={async () => { await handleRoomAction('delete'); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />
            <ConfirmDialog
                isOpen={confirmUnfriend}
                title="Unfriend User"
                description={`Are you sure you want to unfriend ${privatePartner?.username}?`}
                confirmLabel="Unfriend"
                cancelLabel="Cancel"
                variant="danger"
                loading={loadingUnfriend}
                onConfirm={async () => {
                    setLoadingUnfriend(true);
                    await handleUnfriend(privatePartner!.user_id);
                    setLoadingUnfriend(false);
                    setConfirmUnfriend(false);
                }}
                onCancel={() => setConfirmUnfriend(false)}
            />
            <ConfirmDialog
                isOpen={confirmBlock}
                title="Block User"
                description={`Are you sure you want to block ${privatePartner?.username}? They will no longer be able to message you or see your profile.`}
                confirmLabel="Block"
                cancelLabel="Cancel"
                variant="danger"
                loading={loadingBlock}
                onConfirm={async () => {
                    setLoadingBlock(true);
                    await handleBlock(privatePartner!.user_id);
                    setLoadingBlock(false);
                    setConfirmBlock(false);
                }}
                onCancel={() => setConfirmBlock(false)}
            />
            <ConfirmDialog
                isOpen={confirmUnblock}
                title="Unblock User"
                description={`Are you sure you want to unblock ${privatePartner?.username}?`}
                confirmLabel="Unblock"
                cancelLabel="Cancel"
                variant="warning"
                loading={loadingUnblock}
                onConfirm={async () => {
                    setLoadingUnblock(true);
                    await handleUnblock(privatePartner!.user_id);
                    setLoadingUnblock(false);
                    setConfirmUnblock(false);
                }}
                onCancel={() => setConfirmUnblock(false)}
            />
            <ConfirmDialog
                isOpen={confirmAddFriend}
                title="Add Friend"
                description={`Send friend request to ${privatePartner?.username}?`}
                confirmLabel="Send Request"
                cancelLabel="Cancel"
                variant="warning"
                loading={loadingAddFriend}
                onConfirm={async () => {
                    setLoadingAddFriend(true);
                    await handleAddFriend(privatePartner!.user_id);
                    setLoadingAddFriend(false);
                    setConfirmAddFriend(false);
                }}
                onCancel={() => setConfirmAddFriend(false)}
            />
            <ConfirmDialog
                isOpen={confirmCancelRequest}
                title="Cancel Request"
                description={`Cancel friend request to ${privatePartner?.username}?`}
                confirmLabel="Cancel Request"
                cancelLabel="Cancel"
                variant="danger"
                loading={loadingCancelRequest}
                onConfirm={async () => {
                    setLoadingCancelRequest(true);
                    await handleCancelRequest(privatePartner!.user_id);
                    setLoadingCancelRequest(false);
                    setConfirmCancelRequest(false);
                }}
                onCancel={() => setConfirmCancelRequest(false)}
            />
        </div>
    );
}