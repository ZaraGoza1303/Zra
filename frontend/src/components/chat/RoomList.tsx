import { useAuthStore } from '../../store/authStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatTime } from '../../utils/dateUtils';
import { formatLastMessage } from '../../utils/roomUtils';
import { MessageSquare, User, Users } from 'lucide-react';
import type { Room } from '../../types/chat';

interface RoomListProps {
    activeNav: string;
    onSelectRoom: (room: Room) => void;
    onlineUserIds: Set<number>;
}

export default function RoomList({ activeNav, onSelectRoom, onlineUserIds }: RoomListProps) {
    const { user } = useAuthStore();
    const { rooms, selectedRoom, searchTerm, setSearchTerm } = useDashboardStore();
    const settings = useSettingsStore();

    const shouldShowBadge = (room: Room) => {
        if (!room.unread_message || room.unread_message <= 0) return false;
        if (room.type === 'group' && !settings.group_notif) return false;
        if (room.type === 'private' && !settings.message_notif) return false;
        return true;
    };

    return (
        <div className="flex flex-col w-[300px] min-w-[260px] bg-[var(--bg-primary)] border-r border-[var(--border-color)]">
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                    {activeNav === 'home' ? 'Home' : activeNav === 'rooms' ? 'Rooms' : 'Messages'}
                </h1>
            </div>

            <div className="px-4 pb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none w-full"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] text-sm gap-2">
                        <MessageSquare size={28} className="opacity-30" />
                        <span>No rooms found. Create one!</span>
                    </div>
                ) : (
                    rooms.map(room => {
                        const isPrivate = room.type === 'private';
                        const otherMember = isPrivate ? room.members?.find(m => m.user_id !== user?.id) : null;

                        return (
                            <button
                                key={room.id}
                                onClick={() => onSelectRoom(room)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left mb-0.5
                                    ${selectedRoom?.id === room.id
                                        ? 'bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/20'
                                        : 'hover:bg-[var(--bg-tertiary)] border border-transparent'
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    {room.picture || (isPrivate && otherMember?.user_profile_picture) ? (
                                        <img
                                            src={room.picture || otherMember?.user_profile_picture || ''}
                                            alt={isPrivate ? otherMember?.username || '' : room.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
                                            {isPrivate ? <User size={20} /> : <Users size={20} />}
                                        </div>
                                    )}

                                    {shouldShowBadge(room) ? (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-color)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--bg-primary)]">
                                            {(room.unread_message ?? 0) > 99 ? '99+' : room.unread_message}
                                        </span>
                                    ) : isPrivate && otherMember && onlineUserIds.has(otherMember.user_id) ? (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                                    ) : null}
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                                            {isPrivate ? otherMember?.username || 'Direct Message' : room.name}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                                            {formatTime(room.last_message?.sent_at || room.updated_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 min-w-0">
                                            <span className="truncate">
                                                {room.last_message
                                                    ? formatLastMessage(room.last_message, room.type)
                                                    : (isPrivate ? 'No messages yet' : 'Tap to join chat')
                                                }
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
