import React, { useState } from 'react';
import { X, User, Users, Pencil, UserPlus, AlertTriangle, LogOut, Copy } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { FRONTEND_JOIN_URL, getUserImageUrl, getRoomImageUrl } from '../../config';
import { useToastStore } from '../../store/toastStore';
import ConfirmDialog from '../ui/ConfirmDialog';
import ImageCropModal from '../ImageCropModal';


interface RoomInfoSidebarProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    isAdmin: boolean;
    pictureInputRef: React.RefObject<HTMLInputElement | null>;
    handleUpdateRoom: (field: 'name' | 'description' | 'picture', value?: string | File) => Promise<void>;
    handleRoomAction: (action: 'leave' | 'kick' | 'admin' | 'delete') => Promise<void>;
    onClose: () => void;
    onAddMember: (userId: number) => Promise<void>;
    onBack?: () => void;
    onRefresh: () => Promise<void>;
    roomType?: 'group' | 'private';
    onlineUserIds?: Set<number>;
}

export default function RoomInfoSidebar({
    roomName,
    roomPicture,
    isAdmin,
    pictureInputRef,
    handleUpdateRoom,
    handleRoomAction,
    onClose,
    onAddMember,
    onRefresh,
    roomType,
    onlineUserIds
}: RoomInfoSidebarProps) {
    const [showAddMember, setShowAddMember] = useState(false);
    const [cropFile, setCropFile] = useState<File | null>(null); // ← BARU
    const {
        fetchingInfo,
        fetchingMembers,
        privatePartner,
        roomDetails,
        roomMembers,
        totalMemberCount,
        actionLoading,
        editingName, setEditingName,
        editingDesc, setEditingDesc,
        editName, setEditName,
        editDesc, setEditDesc,
        editLoading,
        friendsList,
        addingMember,
        activeMembers,
        mutualRooms
    } = useChatStore();

    const withRefresh = async (fn: () => Promise<void>) => {
        await fn();
        await onRefresh();
    };

    const isPrivate = roomType === 'private';
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { showToast } = useToastStore();

    return (
        <div className="w-[340px] shrink-0 bg-[#161b22] border-l border-[#21262d] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#21262d] shrink-0">
                <h2 className="text-[15px] font-semibold text-[#e6edf3]">{isPrivate ? 'User Info' : 'Group Info'}</h2>
                <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                    <X size={20} />
                </button>
            </div>

            {isPrivate ? (
                <div className="flex flex-col h-full gap-4 items-center px-5 pt-8 pb-6 border-b border-[#21262d] shrink-0">
                    {fetchingInfo ? (
                        <div className="flex items-center gap-2 text-[#8b949e] text-sm py-4">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : privatePartner ? (
                        <>
                            {/* ── Private: avatar bulat ── */}
                            <div className="relative w-[100px] h-[100px] mb-2">
                                <div className="w-full h-full rounded-full bg-[#2a3441] flex items-center justify-center overflow-hidden shadow-xl border border-white/5">
                                    {privatePartner.user_profile_picture ? (
                                        <img src={getUserImageUrl(privatePartner.user_profile_picture)} alt={privatePartner.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-[#8b949e]" />
                                    )}
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <h2 className="text-xl font-bold text-[#e6edf3]">{privatePartner.username}</h2>
                                    {privatePartner.is_verified && (
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400 shrink-0" fill="currentColor">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-[13px] text-[#8b949e] mt-0.5">
                                    {onlineUserIds?.has(privatePartner.user_id) ? (
                                        <span className="text-green-400">● Online</span>
                                    ) : (
                                        <span>● Offline</span>
                                    )}
                                </p>
                            </div>

                            {privatePartner.user_bio && (
                                <div className="w-full mt-4 bg-[#0d1117] p-4 rounded-xl border border-white/5">
                                    <p className="text-[11px] font-bold text-[#8b949e] tracking-widest uppercase mb-2">Bio</p>
                                    <p className="text-[14px] text-[#cdd9f0] leading-relaxed">{privatePartner.user_bio}</p>
                                </div>
                            )}

                            {privatePartner.created_at && (
                                <div className="w-full mt-3 bg-[#0d1117] p-4 rounded-xl border border-white/5">
                                    <p className="text-[11px] font-bold text-[#8b949e] tracking-widest uppercase mb-2">Joined</p>
                                    <p className="text-[14px] text-[#cdd9f0]">
                                        {new Date(privatePartner.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            )}

                            {mutualRooms.length > 0 && (
                                <div className="w-full mt-3 bg-[#0d1117] p-4 rounded-xl border border-white/5">
                                    <p className="text-[11px] font-bold text-[#8b949e] tracking-widest uppercase mb-3">
                                        {mutualRooms.length} Mutual Room{mutualRooms.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {mutualRooms.map(room => (
                                            <div key={room.id} className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-[#1c2128] border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {room.picture ? (
                                                        <img src={getRoomImageUrl(room.picture)} alt={room.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={14} className="text-[#8b949e]" />
                                                    )}
                                                </div>
                                                <span className="text-[13px] text-[#cdd9f0] truncate">{room.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-[#8b949e] py-4 text-center">Failed to load profile.</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-[#21262d] shrink-0">

                        {/* ── Group: avatar bulat + crop modal ── */}
                        <div className="relative w-[104px] h-[104px] group/avatar mb-4">
                            <div className="w-full h-full rounded-full bg-[#2a3441] flex items-center justify-center overflow-hidden shadow-xl border border-white/5">
                                {roomDetails?.picture || roomPicture ? (
                                    <img src={getRoomImageUrl(roomDetails?.picture || roomPicture)} alt={roomName} className="w-full h-full object-cover" />
                                ) : (
                                    <Users size={40} className="text-[#8b949e]" />
                                )}
                            </div>
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => pictureInputRef.current?.click()}
                                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                    >
                                        <Pencil size={20} className="text-white" />
                                    </button>
                                    {/* Hidden file input — buka crop modal, BUKAN langsung upload */}
                                    <input
                                        type="file"
                                        ref={pictureInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setCropFile(file); // ← buka crop modal dulu
                                                // Reset input value biar onChange bisa trigger lagi
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        {/* Name edit */}
                        {editingName ? (
                            <div className="flex items-center gap-2 mb-1.5">
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="bg-[#0d1117] border border-blue-500/50 rounded-lg px-3 py-1.5 text-[#e6edf3] text-[15px] font-bold outline-none"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') withRefresh(() => handleUpdateRoom('name', editName));
                                        if (e.key === 'Escape') setEditingName(false);
                                    }}
                                />
                                <button
                                    onClick={() => withRefresh(() => handleUpdateRoom('name', editName))}
                                    disabled={editLoading}
                                    className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                                >
                                    {editLoading ? '...' : 'Save'}
                                </button>
                                <button onClick={() => setEditingName(false)} className="text-[#8b949e] hover:text-[#e6edf3]">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-1.5">
                                <h2 className="text-[19px] font-bold text-[#e6edf3]">{roomDetails?.name || roomName}</h2>
                                {isAdmin && (
                                    <button
                                        onClick={() => { setEditName(roomDetails?.name || roomName); setEditingName(true); }}
                                        className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                        <p className="text-[13px] text-[#8b949e]">
                            {totalMemberCount !== null ? `${totalMemberCount} members` : 'Loading...'}
                        </p>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase">Description</h3>
                            {isAdmin && !editingDesc && (
                                <button
                                    onClick={() => { setEditDesc(roomDetails?.description || ''); setEditingDesc(true); }}
                                    className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                        {editingDesc ? (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    autoFocus
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                    rows={3}
                                    className="bg-[#0d1117] border border-blue-500/50 rounded-lg px-3 py-2 text-[#e6edf3] text-[14px] outline-none resize-none font-[inherit]"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => withRefresh(() => handleUpdateRoom('description', editDesc))}
                                        disabled={editLoading}
                                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {editLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setEditingDesc(false)}
                                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[14px] text-[#cdd9f0] leading-relaxed">
                                {roomDetails?.description || <span className="text-[#8b949e] italic">No description yet.</span>}
                            </p>
                        )}
                    </div>

                    {/* Members List */}
                    <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase">Members</h3>
                            <span className="bg-[#21262d] text-[#8b949e] text-[11px] px-2.5 py-0.5 rounded-md font-medium">{roomMembers.length}</span>
                        </div>

                        <div className="flex flex-col gap-4">
                            {fetchingMembers ? (
                                <div className="flex justify-center text-[#8b949e]">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : roomMembers.map(member => {
                                const isOnline = activeMembers.includes(member.user_id);
                                return (
                                    <div key={member.user_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <div className="relative">
                                                <div className="w-[42px] h-[42px] rounded-full overflow-hidden">
                                                    {member.user_profile_picture ? (
                                                        <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-[#2a3441] flex items-center justify-center text-[#cdd9f0] font-bold text-[15px]">
                                                            <User size={18} strokeWidth={2} />
                                                        </div>
                                                    )}
                                                </div>
                                                {isOnline && (
                                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#161b22]" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[15px] font-medium text-[#e6edf3] leading-tight mb-0.5">
                                                    {member.username}
                                                </span>
                                                {member.user_bio && (
                                                    <span className="text-[12px] text-[#8b949e] truncate max-w-[160px]">
                                                        {member.user_bio}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {member.role === 'admin' && (
                                            <span className="text-[11px] text-[#8b949e] bg-[#21262d] px-2 py-1 rounded-[6px] font-medium">Admin</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowAddMember(true)}
                            className="mt-6 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-[#8b949e] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/5 hover:text-[#e6edf3] hover:border-white/30 transition-all"
                        >
                            <UserPlus size={18} /> Add Member
                        </button>

                        {/* Add Member Modal */}
                        {showAddMember && (
                            <div
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                                onClick={() => setShowAddMember(false)}
                            >
                                <div
                                    className="w-full max-w-[360px] bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                        <h3 className="text-sm font-semibold text-[#e6edf3]">Add Member</h3>
                                        <button onClick={() => setShowAddMember(false)} className="text-[#8b949e] hover:text-[#e6edf3]">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto p-3">
                                        {friendsList.length === 0 ? (
                                            <div className="text-center py-8 text-[#8b949e] text-sm">No friends to add.</div>
                                        ) : friendsList
                                            .filter(f => !roomMembers.some(m => m.user_id === f.id))
                                            .map(friend => (
                                                <div key={friend.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2a3441] flex items-center justify-center shrink-0">
                                                            {friend.profile_picture ? (
                                                                <img src={getUserImageUrl(friend.profile_picture)} alt={friend.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={18} strokeWidth={2} className="text-[#cdd9f0]" />
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-[#e6edf3]">{friend.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={async () => { await withRefresh(() => onAddMember(friend.id)); }}
                                                        disabled={addingMember}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))
                                        }
                                        {friendsList.length > 0 && friendsList.filter(f => !roomMembers.some(m => m.user_id === f.id)).length === 0 && (
                                            <div className="text-center py-8 text-[#8b949e] text-sm">All friends are already members.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Room Link */}
                    <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                        <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase mb-4">Room Link</h3>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-xl text-[13px] text-[#8b949e] truncate">
                                {roomDetails?.room_link ? `${FRONTEND_JOIN_URL}/${roomDetails.room_link}` : '-'}
                            </div>
                            <button
                                onClick={() => {
                                    if (roomDetails?.room_link) {
                                        navigator.clipboard.writeText(`${FRONTEND_JOIN_URL}/${roomDetails.room_link}`);
                                        showToast('Room link copied!');
                                    }
                                }}
                                className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
                            >
                                <Copy size={16} className="text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="flex flex-col p-6 shrink-0">
                        <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase mb-8">Options</h3>
                        <div className="flex flex-col gap-1">
                            <button className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all mt-1">
                                <AlertTriangle size={18} /> Report Group
                            </button>
                            <button onClick={() => setConfirmLeave(true)} disabled={actionLoading} className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all disabled:opacity-50">
                                <LogOut size={18} /> Leave Group
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    disabled={actionLoading}
                                    className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all disabled:opacity-50 mt-1"
                                >
                                    <AlertTriangle size={18} /> Delete Room
                                </button>
                            )}

                            <ConfirmDialog
                                isOpen={confirmLeave}
                                title="Leave Room"
                                description="Are you sure you want to leave this group?"
                                confirmLabel="Leave Room"
                                cancelLabel="Cancel"
                                variant="danger"
                                loading={actionLoading}
                                onConfirm={async () => { await handleRoomAction('leave'); setConfirmLeave(false); }}
                                onCancel={() => setConfirmLeave(false)}
                            />
                            <ConfirmDialog
                                isOpen={confirmDelete}
                                title="Delete Room"
                                description="Are you sure you want to delete this room? All messages and members will be permanently removed. This action cannot be undone."
                                confirmLabel="Delete Room"
                                cancelLabel="Cancel"
                                variant="danger"
                                loading={actionLoading}
                                onConfirm={async () => { await handleRoomAction('delete'); setConfirmDelete(false); }}
                                onCancel={() => setConfirmDelete(false)}
                            />
                        </div>
                    </div>
                </>
            )}

            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onConfirm={async (croppedFile) => {
                        setCropFile(null);
                        await withRefresh(() => handleUpdateRoom('picture', croppedFile));
                    }}
                    onCancel={() => setCropFile(null)}
                />
            )}
        </div>
    );
}