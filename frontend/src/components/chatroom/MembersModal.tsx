import React from 'react';
import { X, MoreVertical, UserMinus, ShieldAlert } from 'lucide-react';
import { getUserImageUrl } from '../../services/api';
import type { RoomMember } from '../../types/chat';

interface MembersModalProps {
    roomMembers: RoomMember[];
    user: { id: number } | null | undefined;
    isAdmin: boolean;
    fetchingMembers: boolean;
    targetUserId: number | null;
    actionLoading: boolean;
    setTargetUserId: (id: number | null) => void;
    onClose: () => void;
    handleRoomAction: (action: 'kick' | 'admin') => Promise<void>;
}

export default function MembersModal({
    roomMembers,
    user,
    isAdmin,
    fetchingMembers,
    targetUserId,
    actionLoading,
    setTargetUserId,
    onClose,
    handleRoomAction
}: MembersModalProps) {
    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[380px] bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-[#e6edf3]">Members</h2>
                        <p className="text-xs text-[#8b949e] mt-0.5">{roomMembers.length} people in this room</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Member List */}
                <div className="flex-1 overflow-y-auto p-3">
                    {fetchingMembers ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-[#8b949e]">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : roomMembers.length > 0 ? (
                        roomMembers.map(member => (
                            <div
                                key={member.user_id}
                                onClick={() => member.user_id !== user?.id && setTargetUserId(member.user_id)}
                                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all mb-0.5
                                    ${targetUserId === member.user_id
                                        ? 'bg-blue-600/15 border border-blue-600/20'
                                        : member.user_id !== user?.id ? 'hover:bg-white/4 border border-transparent' : 'border border-transparent opacity-70 cursor-default'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                                    {member.user_profile_picture ? (
                                        <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                            {member.username?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-medium text-[#e6edf3] truncate">
                                            {member.username}
                                        </span>
                                        {member.user_id === user?.id && (
                                            <span className="text-[10px] text-[#8b949e] font-normal">(You)</span>
                                        )}
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block font-medium
                                        ${member.role === 'admin'
                                            ? 'bg-yellow-500/15 text-yellow-400'
                                            : 'bg-blue-500/15 text-blue-400'
                                        }`}
                                    >
                                        {member.role}
                                    </span>
                                </div>
                                {member.role !== 'admin' && member.user_id !== user?.id && isAdmin && (
                                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors">
                                        <MoreVertical size={14} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-[#8b949e] text-sm">No members found.</div>
                    )}
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
                        <button
                            onClick={() => handleRoomAction('kick')}
                            disabled={actionLoading || targetUserId === null || targetUserId === user?.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <UserMinus size={14} /> Kick
                        </button>
                        <button
                            onClick={() => handleRoomAction('admin')}
                            disabled={actionLoading || targetUserId === null || targetUserId === user?.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ShieldAlert size={14} /> Make Admin
                        </button>
                    </div>
                )}

                <div className="p-4 pt-0" hidden={isAdmin}>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-[#e6edf3] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
