import { ChevronRight, UserX, UserCheck, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';
import type { FriendRequest } from '../../../types/contacts';

interface Props {
    user: FriendRequest;
    actionLoading: number | null;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    onViewDetail: () => void;
}

export default function RequestCard({ user, actionLoading, onApprove, onReject, onViewDetail }: Props) {
    const isLoading = actionLoading === user.id;

    return (
        <div className="flex flex-col gap-3 px-3 py-3.5 rounded-xl bg-[#1c2128]/60 border border-white/5 mb-2">
            <div className="flex items-center gap-3">
                <button onClick={onViewDetail}><Avatar src={user.profile_picture} name={user.name} size={42} /></button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetail}>
                    <p className="text-sm font-medium text-[#e6edf3] truncate hover:text-blue-400 transition-colors">{user.name}</p>
                    <p className="text-xs text-[#8b949e]">@{user.username}</p>
                    {user.bio && <p className="text-xs text-[#8b949e] mt-0.5 truncate">{user.bio}</p>}
                </div>
                <button onClick={onViewDetail} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors">
                    <ChevronRight size={14} />
                </button>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onReject(user.id)} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-red-500/15 hover:text-red-400 border border-white/10 disabled:opacity-40 transition-colors">
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />} Decline
                </button>
                <button onClick={() => onApprove(user.id)} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors">
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Accept
                </button>
            </div>
        </div>
    );
}