import { ArrowLeft, MessageSquare, UserPlus, Clock, UserX, UserCheck, Loader2, CheckCircle } from 'lucide-react';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import type { UserDetailDrawerProps } from '../../types/contacts';

export default function UserDetailDrawer({ user, onClose, onFriendAction, onUnfriend, onDirectMessage, actionLoading, dmLoading }: UserDetailDrawerProps) {
    const isLoading = actionLoading === user.id;

    return (
        <div className="absolute inset-0 bg-[var(--bg-primary)] z-10 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <span className="text-sm font-semibold text-[var(--text-primary)]">Profile</span>
            </div>

            <div className="flex flex-col items-center px-6 pt-8 pb-6 border-b border-[var(--border-color)]">
                <div className="relative mb-4">
                    <Avatar src={user.profile_picture} name={user.name} size={80} />
                    {user.friendship_status === 'friend' && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center">
                            <CheckCircle size={10} className="text-white" />
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-0.5">{user.name}</h3>
                <p className="text-sm text-[var(--text-muted)] mb-3">@{user.username}</p>
                {user.bio && <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed max-w-[220px] mb-3">{user.bio}</p>}
                <StatusBadge status={user.friendship_status} />
            </div>

            <div className="flex flex-col gap-3 px-4 pt-5">
                <button
                    onClick={() => onDirectMessage(user.id, user)}
                    disabled={dmLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] border border-[var(--border-light)] hover:bg-[var(--accent-color)]/10 hover:border-[var(--accent-color)]/20 hover:text-[var(--accent-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {dmLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                    Direct Message
                </button>

                {(user.friendship_status === 'none' || !user.friendship_status) && (
                    <button onClick={() => onFriendAction(user.id, 'add')} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 disabled:opacity-50 transition-colors">
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                        Send Friend Request
                    </button>
                )}

                {user.friendship_status === 'pending_sent' && (
                    <button onClick={() => onFriendAction(user.id, 'cancel')} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-colors">
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                        Cancel Request
                    </button>
                )}

                {user.friendship_status === 'pending_received' && (
                    <div className="flex gap-2">
                        <button onClick={() => onFriendAction(user.id, 'reject')} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] hover:bg-red-500/15 hover:text-red-400 border border-[var(--border-light)] disabled:opacity-50 transition-colors">
                            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
                            Decline
                        </button>
                        <button onClick={() => onFriendAction(user.id, 'approve')} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 disabled:opacity-50 transition-colors">
                            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
                            Accept
                        </button>
                    </div>
                )}

                {user.friendship_status === 'friend' && (
                    <>
                        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            <UserCheck size={16} /> Already Friends
                        </div>
                        <button onClick={() => onUnfriend(user.id)} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-[var(--border-color)] hover:border-red-500/20 disabled:opacity-50 transition-colors">
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                            Unfriend
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}