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
        <div className="w-full flex items-center justify-between bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 mb-3 hover:border-[var(--accent-color)]/30 transition-all group/card relative">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative cursor-pointer" onClick={onViewDetail}>
                    <Avatar src={user.profile_picture} name={user.name} size={52} />
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[var(--bg-secondary)]" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{user.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${isOnline ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                        {isOnline ? (
                            <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
                        ) : (
                            <>
                                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]/30" />
                                <span className="text-[10px] text-[var(--text-muted)]">Away</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative group/menu">
                    <button className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all">
                        <MoreVertical size={18} />
                    </button>

                    {/* Hover Menu */}
                    <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                        <button
                            onClick={() => useToastStore.getState().showToast('Added to favorites!', 'info')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-yellow-500 hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <Star size={14} />
                            <span>Favorite</span>
                        </button>
                        <button
                            onClick={() => onUnfriend?.(user.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors border-t border-[var(--border-color)]"
                        >
                            <UserX size={14} />
                            <span>Unfriend</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={onStartChat}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-color)] text-[var(--text-primary)] hover:text-white rounded-xl text-sm font-medium transition-all group/btn"
                >
                    <MessageSquare size={16} className="text-[var(--text-muted)] group-hover/btn:text-white transition-colors" />
                    <span>Start Chat</span>
                </button>
            </div>
        </div>
    );
}