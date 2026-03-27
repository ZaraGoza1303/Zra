import { useState, useEffect } from 'react';
import { X, MessageSquare, UserPlus, Clock, UserCheck, Loader2, UserX, Link2, ShieldOff } from 'lucide-react';
import { apiCall, getBlockedUsers } from '../../services/api';
import Avatar from './Avatar';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToastStore } from '../../store/toastStore';
import type { SearchedUser } from '../../types/contacts';
import type { SocialLink } from '../../types/chat';

interface UserDetailModalProps {
    user: SearchedUser;
    onClose: () => void;
    onDirectMessage: (targetId: number, targetUser: SearchedUser) => void;
    dmLoading?: boolean;
}

export default function UserDetailModal({
    user,
    onClose,
    onDirectMessage,
    dmLoading
}: UserDetailModalProps) {
    const [bio, setBio] = useState<string | null>(null);
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState<'friend' | 'pending_sent' | 'pending_received' | 'none'>('none');
    const { showToast } = useToastStore();

    const [confirmUnfriend, setConfirmUnfriend] = useState(false);
    const [confirmBlock, setConfirmBlock] = useState(false);
    const [confirmUnblock, setConfirmUnblock] = useState(false);
    const [confirmAddFriend, setConfirmAddFriend] = useState(false);
    const [confirmCancelRequest, setConfirmCancelRequest] = useState(false);
    const [confirmAccept, setConfirmAccept] = useState(false);
    const [confirmReject, setConfirmReject] = useState(false);

    const [loadingUnfriend, setLoadingUnfriend] = useState(false);
    const [loadingBlock, setLoadingBlock] = useState(false);
    const [loadingUnblock, setLoadingUnblock] = useState(false);
    const [loadingAddFriend, setLoadingAddFriend] = useState(false);
    const [loadingCancelRequest, setLoadingCancelRequest] = useState(false);
    const [loadingAccept, setLoadingAccept] = useState(false);
    const [loadingReject, setLoadingReject] = useState(false);

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const [userRes, linksRes, blockedRes] = await Promise.all([
                    apiCall<{ data: SearchedUser }>(`/user/${user.id}`),
                    apiCall<{ data: SocialLink[] }>(`/user/social-links/${user.id}`),
                    getBlockedUsers()
                ]);
                if (userRes?.data) {
                    setBio(userRes.data.bio || null);
                }
                if (linksRes?.data) {
                    setSocialLinks(linksRes.data);
                }
                if (blockedRes?.data) {
                    setIsBlocked(blockedRes.data.some(b => b.id === user.id));
                }
            } catch (err) {
                console.error('Failed to fetch user details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUserDetails();
    }, [user.id]);

    useEffect(() => {
        const checkFriendshipStatus = async () => {
            try {
                const res = await apiCall<{ data: { status: 'friend' | 'pending_sent' | 'pending_received' | 'none' } }>(
                    `/user/friendship-status/${user.id}`,
                    { method: 'GET' }
                );
                setFriendshipStatus(res.data.status);
            } catch (err) {
                console.error('Failed to check friendship status:', err);
            }
        };
        checkFriendshipStatus();
    }, [user.id]);

    const handleAddFriend = async () => {
        setLoadingAddFriend(true);
        try {
            await apiCall(`/user/make-friend-requests/${user.id}`, { method: 'POST' });
            setFriendshipStatus('pending_sent');
            showToast('Friend request sent');
        } catch (err: any) {
            showToast(err.message || 'Failed to send friend request', 'error');
        } finally {
            setLoadingAddFriend(false);
            setConfirmAddFriend(false);
        }
    };

    const handleCancelRequest = async () => {
        setLoadingCancelRequest(true);
        try {
            await apiCall(`/user/cancel-friend-request/${user.id}`, { method: 'DELETE' });
            setFriendshipStatus('none');
            showToast('Friend request cancelled');
        } catch (err: any) {
            showToast(err.message || 'Failed to cancel request', 'error');
        } finally {
            setLoadingCancelRequest(false);
            setConfirmCancelRequest(false);
        }
    };

    const handleAcceptRequest = async () => {
        setLoadingAccept(true);
        try {
            await apiCall(`/user/accept-friend-requests/${user.id}`, { method: 'PUT' });
            setFriendshipStatus('friend');
            showToast('Friend request accepted');
        } catch (err: any) {
            showToast(err.message || 'Failed to accept request', 'error');
        } finally {
            setLoadingAccept(false);
            setConfirmAccept(false);
        }
    };

    const handleRejectRequest = async () => {
        setLoadingReject(true);
        try {
            await apiCall(`/user/reject-friend/${user.id}`, { method: 'DELETE' });
            setFriendshipStatus('none');
            showToast('Friend request rejected');
        } catch (err: any) {
            showToast(err.message || 'Failed to reject request', 'error');
        } finally {
            setLoadingReject(false);
            setConfirmReject(false);
        }
    };

    const handleUnfriend = async () => {
        setLoadingUnfriend(true);
        try {
            await apiCall(`/user/unfriend/${user.id}`, { method: 'DELETE' });
            setFriendshipStatus('none');
            showToast('User unfriended');
        } catch (err: any) {
            showToast(err.message || 'Failed to unfriend', 'error');
        } finally {
            setLoadingUnfriend(false);
            setConfirmUnfriend(false);
        }
    };

    const handleBlock = async () => {
        setLoadingBlock(true);
        try {
            await apiCall(`/user/block/${user.id}`, { method: 'POST' });
            setIsBlocked(true);
            showToast('User blocked');
        } catch (err: any) {
            if (err.message === 'user already blocked') {
                setIsBlocked(true);
                showToast('User is already blocked');
            } else {
                showToast(err.message || 'Failed to block user', 'error');
            }
        } finally {
            setLoadingBlock(false);
            setConfirmBlock(false);
        }
    };

    const handleUnblock = async () => {
        setLoadingUnblock(true);
        try {
            await apiCall(`/user/block/${user.id}`, { method: 'DELETE' });
            setIsBlocked(false);
            showToast('User unblocked');
        } catch (err: any) {
            showToast(err.message || 'Failed to unblock user', 'error');
        } finally {
            setLoadingUnblock(false);
            setConfirmUnblock(false);
        }
    };



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">User Profile</h2>
                    <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Avatar & Basic Info */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-4">
                            <Avatar src={user.profile_picture} name={user.name} size={80} />
                            {user.friendship_status === 'friend' && (
                                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[var(--bg-secondary)] flex items-center justify-center">
                                    <UserCheck size={10} className="text-white" />
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{user.name}</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-2">@{user.username}</p>
                        {user.friendship_status && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.friendship_status === 'friend' ? 'bg-emerald-500/15 text-emerald-400' :
                                user.friendship_status === 'pending_sent' ? 'bg-amber-500/15 text-amber-400' :
                                    user.friendship_status === 'pending_received' ? 'bg-blue-500/15 text-blue-400' :
                                        'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                }`}>
                                {user.friendship_status === 'friend' ? 'Friend' :
                                    user.friendship_status === 'pending_sent' ? 'Request Sent' :
                                        user.friendship_status === 'pending_received' ? 'Pending Request' : 'Not Friends'}
                            </span>
                        )}
                    </div>

                    {/* Bio */}
                    {loading ? (
                        <div className="flex items-center justify-center py-4 mb-4">
                            <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : bio ? (
                        <div className="bg-[var(--bg-primary)] rounded-xl p-4 border border-[var(--border-color)] mb-4">
                            <p className="text-sm text-[#cdd9f0] leading-relaxed">{bio}</p>
                        </div>
                    ) : null}

                    {/* Social Links */}
                    {!loading && socialLinks.length > 0 && (
                        <div className="bg-[var(--bg-primary)] rounded-xl p-4 border border-[var(--border-color)] mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Link2 size={14} className="text-[var(--text-muted)]" />
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Social Links</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {socialLinks.map((link) => {
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
                                                return <MessageSquare className={className} />;
                                        }
                                    };
                                    const iconColor = link.type === 'youtube' ? 'text-red-500' :
                                        link.type === 'instagram' ? 'text-pink-500' :
                                            link.type === 'github' ? 'text-gray-300' :
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

                    {/* Actions */}
                    <div className="flex flex-col gap-3 mt-6">
                        <button
                            onClick={() => onDirectMessage(user.id, user)}
                            disabled={dmLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {dmLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                            Direct Message
                        </button>

                        {friendshipStatus === 'none' && (
                            <button
                                onClick={() => setConfirmAddFriend(true)}
                                disabled={loadingAddFriend}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] border border-[var(--border-light)] hover:bg-[var(--accent-color)]/10 hover:border-[var(--accent-color)]/20 hover:text-[var(--accent-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loadingAddFriend ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                Add Friend
                            </button>
                        )}

                        {friendshipStatus === 'pending_sent' && (
                            <button
                                onClick={() => setConfirmCancelRequest(true)}
                                disabled={loadingCancelRequest}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                            >
                                {loadingCancelRequest ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                                Cancel Request
                            </button>
                        )}

                        {friendshipStatus === 'pending_received' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfirmReject(true)}
                                    disabled={loadingReject}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] hover:bg-red-500/15 hover:text-red-400 border border-[var(--border-light)] disabled:opacity-50 transition-colors"
                                >
                                    {loadingReject ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
                                    Decline
                                </button>
                                <button
                                    onClick={() => setConfirmAccept(true)}
                                    disabled={loadingAccept}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 disabled:opacity-50 transition-colors"
                                >
                                    {loadingAccept ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
                                    Accept
                                </button>
                            </div>
                        )}

                        {friendshipStatus === 'friend' && (
                            <button
                                onClick={() => setConfirmUnfriend(true)}
                                disabled={loadingUnfriend}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-[var(--border-color)] hover:border-red-500/20 disabled:opacity-50 transition-colors"
                            >
                                {loadingUnfriend ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                                Unfriend
                            </button>
                        )}

                        {isBlocked ? (
                            <button
                                onClick={() => setConfirmUnblock(true)}
                                disabled={loadingUnblock}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 disabled:opacity-50 transition-colors"
                            >
                                {loadingUnblock ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                                Unblock User
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirmBlock(true)}
                                disabled={loadingBlock}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 disabled:opacity-50 transition-colors"
                            >
                                {loadingBlock ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                                Block User
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Dialogs */}
            {confirmAddFriend && (
                <ConfirmDialog
                    isOpen={true}
                    title="Add Friend"
                    description={`Are you sure you want to send a friend request to ${user.name}?`}
                    confirmLabel="Send Request"
                    variant="warning"
                    onConfirm={handleAddFriend}
                    onCancel={() => setConfirmAddFriend(false)}
                    loading={loadingAddFriend}
                />
            )}

            {confirmCancelRequest && (
                <ConfirmDialog
                    isOpen={true}
                    title="Cancel Request"
                    description={`Are you sure you want to cancel the friend request to ${user.name}?`}
                    confirmLabel="Cancel Request"
                    variant="warning"
                    onConfirm={handleCancelRequest}
                    onCancel={() => setConfirmCancelRequest(false)}
                    loading={loadingCancelRequest}
                />
            )}

            {confirmAccept && (
                <ConfirmDialog
                    isOpen={true}
                    title="Accept Request"
                    description={`Do you want to accept the friend request from ${user.name}?`}
                    confirmLabel="Accept"
                    variant="warning"
                    onConfirm={handleAcceptRequest}
                    onCancel={() => setConfirmAccept(false)}
                    loading={loadingAccept}
                />
            )}

            {confirmReject && (
                <ConfirmDialog
                    isOpen={true}
                    title="Reject Request"
                    description={`Do you want to reject the friend request from ${user.name}?`}
                    confirmLabel="Reject"
                    variant="danger"
                    onConfirm={handleRejectRequest}
                    onCancel={() => setConfirmReject(false)}
                    loading={loadingReject}
                />
            )}

            {confirmUnfriend && (
                <ConfirmDialog
                    isOpen={true}
                    title="Unfriend"
                    description={`Are you sure you want to unfriend ${user.name}?`}
                    confirmLabel="Unfriend"
                    variant="danger"
                    onConfirm={handleUnfriend}
                    onCancel={() => setConfirmUnfriend(false)}
                    loading={loadingUnfriend}
                />
            )}

            {confirmBlock && (
                <ConfirmDialog
                    isOpen={true}
                    title="Block User"
                    description={`Are you sure you want to block ${user.name}? They will no longer be able to message you or see your profile.`}
                    confirmLabel="Block"
                    variant="danger"
                    onConfirm={handleBlock}
                    onCancel={() => setConfirmBlock(false)}
                    loading={loadingBlock}
                />
            )}

            {confirmUnblock && (
                <ConfirmDialog
                    isOpen={true}
                    title="Unblock User"
                    description={`Are you sure you want to unblock ${user.name}?`}
                    confirmLabel="Unblock"
                    variant="warning"
                    onConfirm={handleUnblock}
                    onCancel={() => setConfirmUnblock(false)}
                    loading={loadingUnblock}
                />
            )}
        </div>
    );
}