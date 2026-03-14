import { MessageSquare, ChevronRight } from 'lucide-react';
import Avatar from '../Avatar';
import type { SearchedUser } from '../../../types/contacts';

interface Props {
    user: SearchedUser;
    onViewDetail: () => void;
    isOnline?: boolean;
}

export default function FriendCard({ user, onViewDetail, isOnline = false }: Props) {
    return (
        <button onClick={onViewDetail} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/4 transition-colors text-left mb-0.5 group">
            <div className="relative">
                <Avatar src={user.profile_picture} name={user.name} size={42} />
                {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111318]" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e6edf3] truncate group-hover:text-blue-400 transition-colors">{user.name}</p>
                <p className="text-xs text-[#8b949e] truncate">@{user.username}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b949e]"><MessageSquare size={14} /></span>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b949e]"><ChevronRight size={14} /></span>
            </div>
        </button>
    );
}