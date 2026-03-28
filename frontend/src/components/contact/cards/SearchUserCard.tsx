import { MessageSquare, Loader2, User } from 'lucide-react';
import Avatar from '../Avatar';
import StatusBadge from '../StatusBadge';
import type { SearchedUser } from '../../../types/contacts';

interface Props {
    user: SearchedUser;
    onViewDetail?: () => void;
    currentUserId?: number;
    onDirectMessage: (targetId: number, targetUser: SearchedUser) => void;
    dmLoading?: boolean;
}

export default function SearchUserCard({ user, onViewDetail, onDirectMessage, dmLoading, currentUserId }: Props) {
    const isSelf = user.id === currentUserId;

    return (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-tertiary)]/40 transition-colors group mb-0.5">
            <div className="shrink-0">
                <Avatar src={user.profile_picture} name={user.name} size={42} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{user.name}</span>
                    <StatusBadge status={user.friendship_status} />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">@{user.username}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {!isSelf && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDirectMessage(user.id, user);
                        }}
                        disabled={dmLoading}
                        title="Direct Message"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-color)]/15 hover:text-[var(--accent-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {dmLoading ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                    </button>
                )}

                {!isSelf && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail?.();
                        }}
                        title="View Profile"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-color)]/15 hover:text-[var(--accent-color)] transition-colors"
                    >
                        <User size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}