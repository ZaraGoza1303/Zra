import { MessageSquare, Info, UserPlus, Clock, UserCheck, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';
import StatusBadge from '../StatusBadge';
import type { SearchedUser } from '../../../types/contacts';

interface Props {
    user: SearchedUser;
    actionLoading: number | null;
    onAdd: (id: number) => void;
    onViewDetail: () => void;
    currentUserId?: number;
    onDirectMessage: (targetId: number, targetUser: SearchedUser) => void;
    dmLoading?: boolean;
}

export default function SearchUserCard({ user, actionLoading, onAdd, onViewDetail, onDirectMessage, dmLoading, currentUserId }: Props) {
    const isLoading = actionLoading === user.id;
    const isSelf = user.id === currentUserId;

    return (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/4 transition-colors group mb-0.5">
            <button onClick={onViewDetail} className="shrink-0">
                <Avatar src={user.profile_picture} name={user.name} size={42} />
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetail}>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e6edf3] truncate hover:text-blue-400 transition-colors">{user.name}</span>
                    <StatusBadge status={user.friendship_status} />
                </div>
                <p className="text-xs text-[#8b949e] truncate">@{user.username}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {/* DM button - aktif kalau bukan diri sendiri */}
                {!isSelf ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDirectMessage(user.id, user);
                        }}
                        disabled={dmLoading}
                        title="Direct Message"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-blue-500/15 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {dmLoading ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                    </button>
                ) : (
                    <button disabled className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] opacity-30 cursor-not-allowed">
                        <MessageSquare size={15} />
                    </button>
                )}

                <button onClick={onViewDetail} title="View Profile" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors">
                    <Info size={15} />
                </button>

                {!isSelf && (
                    user.friendship_status === 'friend' ? (
                        <button disabled className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 opacity-60 cursor-not-allowed">
                            <UserCheck size={15} />
                        </button>
                    ) : user.friendship_status === 'pending_sent' ? (
                        <button disabled className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 opacity-60 cursor-not-allowed">
                            <Clock size={15} />
                        </button>
                    ) : (
                        <button onClick={() => onAdd(user.id)} disabled={isLoading} title="Add Friend" className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/15 disabled:opacity-50 transition-colors">
                            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}