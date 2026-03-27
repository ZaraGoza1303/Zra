import type { LastMessage, Room } from '../types/chat';

export const sortByLatest = (arr: Room[]): Room[] => [...arr].sort((a, b) => {
    const aTime = a.last_message?.sent_at || '';
    const bTime = b.last_message?.sent_at || '';
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
});

export const getRoomDisplayInfo = (
    room: Room,
    currentUserId?: number
): { name: string; picture: string | null } => {
    if (room.type !== 'group') {
        const otherMember = room.members?.find(m => m.user_id !== currentUserId);
        return {
            name: otherMember?.name || otherMember?.username || 'Direct Message',
            picture: otherMember?.user_profile_picture || null,
        };
    }
    return { name: room.name, picture: room.picture || null };
};

export const formatLastMessage = (msg?: LastMessage, _roomType?: string): string | null => {
    if (!msg) return null;

    if (msg.type === 'image') {
        if (msg.caption) {
            return msg.caption;
        }
        return 'Image';
    }

    if (msg.type === 'sticker') {
        return 'Sticker';
    }

    return msg.content;
};