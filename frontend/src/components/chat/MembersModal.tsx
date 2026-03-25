import { X, MoreVertical, UserMinus, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getUserImageUrl } from '../../services/api';

interface MembersModalProps {
    isAdmin: boolean;
    onClose: () => void;
    handleRoomAction: (action: 'kick' | 'admin') => Promise<void>;
}

export default function MembersModal({
    isAdmin,
    onClose,
    handleRoomAction
}: MembersModalProps) {
    const { user } = useAuthStore();
    const { roomMembers, fetchingMembers, targetUserId, actionLoading, setTargetUserId } = useChatStore();

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[380px] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Members</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{roomMembers.length} people in this room</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Member List */}
                <div className="flex-1 overflow-y-auto p-3">
                    {fetchingMembers ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
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
                                        : member.user_id !== user?.id ? 'hover:bg-[var(--bg-tertiary)] border border-transparent' : 'border border-transparent opacity-70 cursor-default'
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
                                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {member.username}
                                        </span>
                                        {member.user_id === user?.id && (
                                            <span className="text-[10px] text-[var(--text-muted)] font-normal">(You)</span>
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
                                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                                        <MoreVertical size={14} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-[var(--text-muted)] text-sm">No members found.</div>
                    )}
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="p-4 border-t border-[var(--border-color)] flex gap-2 shrink-0">
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
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:brightness-110 border border-[var(--border-light)] transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
