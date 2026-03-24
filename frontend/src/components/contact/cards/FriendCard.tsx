import { MessageSquare, MoreVertical, Star, UserX } from 'lucide-react';
import Avatar from '../Avatar';
import type { SearchedUser } from '../../../types/contacts';
import { useToastStore } from '../../../store/toastStore';

interface Props {
    user: SearchedUser;
    onViewDetail: () => void;
    onStartChat?: () => void;
    onUnfriend?: (id: number) => void;
    isOnline?: boolean;
}

export default function FriendCard({ user, onViewDetail, onStartChat, onUnfriend, isOnline = false }: Props) {
    return (
        <div className="w-full flex items-center justify-between bg-[#161b22] border border-white/5 rounded-2xl p-4 mb-3 hover:border-blue-500/30 transition-all group/card relative">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative cursor-pointer" onClick={onViewDetail}>
                    <Avatar src={user.profile_picture} name={user.name} size={52} />
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[#161b22]" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[#e6edf3] truncate">{user.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${isOnline ? 'text-emerald-500' : 'text-[#8b949e]'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                        {isOnline ? (
                            <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
                        ) : (
                            <>
                                <span className="w-1 h-1 rounded-full bg-[#8b949e]/30" />
                                <span className="text-[10px] text-[#8b949e]">Away</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative group/menu">
                    <button className="w-9 h-9 flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/5 rounded-xl transition-all">
                        <MoreVertical size={18} />
                    </button>

                    {/* Hover Menu */}
                    <div className="absolute right-0 top-full mt-1 w-40 bg-[#1c2128] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                        <button
                            onClick={() => useToastStore.getState().showToast('Added to favorites!', 'info')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#8b949e] hover:text-yellow-500 hover:bg-white/5 transition-colors"
                        >
                            <Star size={14} />
                            <span>Favorite</span>
                        </button>
                        <button
                            onClick={() => onUnfriend?.(user.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
                        >
                            <UserX size={14} />
                            <span>Unfriend</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={onStartChat}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1c2128] hover:bg-blue-600 text-[#e6edf3] hover:text-white rounded-xl text-sm font-medium transition-all group/btn"
                >
                    <MessageSquare size={16} className="text-[#8b949e] group-hover/btn:text-white transition-colors" />
                    <span>Start Chat</span>
                </button>
            </div>
        </div>
    );
}