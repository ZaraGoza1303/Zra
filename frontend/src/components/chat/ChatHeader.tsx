// No need for React import 
import { ArrowLeft, User, Users, Video, Phone, MoreHorizontal } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { getRoomImageUrl } from '../../utils/imageUtils';

interface ChatHeaderProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    roomType?: 'group' | 'private';
    onBack?: () => void;
    onOpenInfoModal: () => void;
    onStartCall?: (withVideo: boolean) => void;
    onlineUserIds?: Set<number>;
}

export default function ChatHeader({
    roomId,
    roomName,
    roomPicture,
    roomType,
    onBack,
    onOpenInfoModal,
    onStartCall,
    onlineUserIds
}: ChatHeaderProps) {
    const { totalMemberCount, roomDetails, privatePartner, typingUsers } = useChatStore();
    const isPrivate = roomType === 'private';
    const partnerTyping = isPrivate
        && privatePartner
        && Object.keys(typingUsers[roomId] || {}).some(
            uid => Number(uid) === Number(privatePartner.user_id)
        );

    return (

        <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--bg-primary)] border-b border-[var(--border-color)] shrink-0">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={onOpenInfoModal}
                >
                    {roomDetails?.picture || roomPicture ? (
                        <img src={getRoomImageUrl(roomDetails?.picture || roomPicture)} alt={roomName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
                            {isPrivate ? <User size={18} /> : <Users size={18} />}
                        </div>
                    )}
                    <div>
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight group-hover:text-blue-400 transition-colors">
                            {roomName}
                        </h3>
                        <p className="text-[12px] text-[var(--text-muted)] leading-tight mt-0.5">
                            {isPrivate
                                ? partnerTyping
                                    ? <span className="text-[var(--accent-color)] animate-pulse">typing...</span>
                                    : onlineUserIds?.has(Number(privatePartner?.user_id))
                                        ? <span className="text-green-400">● Online</span>
                                        : <span>● Offline</span>
                                : totalMemberCount !== null
                                    ? `${totalMemberCount > 999 ? '999+' : totalMemberCount} members`
                                    : 'Click to view info'
                            }
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                {isPrivate && (
                    <button
                        onClick={() => onStartCall?.(true)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Video Call"
                    >
                        <Video size={18} />
                    </button>
                )}
                {isPrivate && (
                    <button
                        onClick={() => onStartCall?.(false)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Voice Call"
                    >
                        <Phone size={18} />
                    </button>
                )}
                {isPrivate && (
                    <button
                        onClick={onOpenInfoModal}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        title="More"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                )}
                {!isPrivate && (
                    <button
                        onClick={onOpenInfoModal}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        title="More"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
