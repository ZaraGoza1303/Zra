import React from 'react';
import { ArrowLeft, User, Users, Video, Phone, MoreHorizontal } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface ChatHeaderProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    roomType?: 'group' | 'private';
    onBack?: () => void;
    onOpenInfoModal: () => void;
    onOpenUsersModal: () => void;
}

export default function ChatHeader({
    roomId,
    roomName,
    roomPicture,
    roomType,
    onBack,
    onOpenInfoModal,
    onOpenUsersModal
}: ChatHeaderProps) {
    const { totalMemberCount, activeMemberCount, roomDetails } = useChatStore();
    const isPrivate = roomType === 'private';

    return (
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0d1117] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={onOpenInfoModal}
                >
                    {roomPicture ? (
                        <img src={roomPicture} alt={roomName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1c2128] border border-white/10 flex items-center justify-center text-[#8b949e]">
                            {isPrivate ? <User size={18} /> : <Users size={18} />}
                        </div>
                    )}
                    <div>
                        <h3 className="text-[15px] font-semibold text-[#e6edf3] leading-tight group-hover:text-blue-400 transition-colors">
                            {roomName}
                        </h3>
                        <p className="text-[12px] text-[#8b949e] leading-tight mt-0.5">
                            {isPrivate
                                ? 'Direct Message'
                                : totalMemberCount !== null
                                    ? `${totalMemberCount > 999 ? '999+' : totalMemberCount} members`
                                    : 'Click to view info'
                            }
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                    title="Video Call"
                >
                    <Video size={18} />
                </button>
                <button
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                    title="Voice Call"
                >
                    <Phone size={18} />
                </button>
                {!isPrivate && (
                    <button
                        onClick={onOpenUsersModal}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                        title="Members"
                    >
                        <Users size={18} />
                    </button>
                )}
                {!isPrivate && (
                    <button
                        onClick={onOpenInfoModal}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                        title="More"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
