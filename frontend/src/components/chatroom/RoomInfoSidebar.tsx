import React from 'react';
import { X, User, Users, Pencil, UserPlus, Bell, Star, AlertTriangle, LogOut } from 'lucide-react';
import { getUserImageUrl } from '../../services/api';
import type { RoomMember, RoomResponse } from '../../types/chat';

interface RoomInfoSidebarProps {
    roomId: string;
    roomName: string;
    roomPicture?: string;
    isPrivate: boolean;
    fetchingInfo: boolean;
    fetchingMembers: boolean;
    privatePartner: { username: string; user_bio?: string; user_profile_picture?: string } | null;
    roomDetails: RoomResponse | null;
    roomMembers: RoomMember[];
    totalMemberCount: number | null;
    activeMemberCount: number | null;
    isAdmin: boolean;
    user: { id: number } | null | undefined;
    actionLoading: boolean;
    editingName: boolean;
    editingDesc: boolean;
    editName: string;
    editDesc: string;
    pictureInputRef: React.RefObject<HTMLInputElement>;
    setPreviewPicture: (data: { file: File; url: string }) => void;
    setEditingName: (val: boolean) => void;
    setEditingDesc: (val: boolean) => void;
    setEditName: (val: string) => void;
    setEditDesc: (val: string) => void;
    handleUpdateRoom: (field: 'name' | 'description' | 'picture', value?: string | File) => Promise<void>;
    handleRoomAction: (action: 'leave' | 'kick' | 'admin') => Promise<void>;
    onClose: () => void;
    editLoading: boolean;
}

export default function RoomInfoSidebar({
    roomName,
    roomPicture,
    isPrivate,
    fetchingInfo,
    fetchingMembers,
    privatePartner,
    roomDetails,
    roomMembers,
    totalMemberCount,
    activeMemberCount,
    isAdmin,
    user,
    actionLoading,
    editingName,
    editingDesc,
    editName,
    editDesc,
    pictureInputRef,
    setPreviewPicture,
    setEditingName,
    setEditingDesc,
    setEditName,
    setEditDesc,
    handleUpdateRoom,
    handleRoomAction,
    onClose,
    editLoading
}: RoomInfoSidebarProps) {
    return (
        <div className="w-[340px] shrink-0 bg-[#161b22] border-l border-[#21262d] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#21262d] shrink-0">
                <h2 className="text-[15px] font-semibold text-[#e6edf3]">{isPrivate ? 'User Info' : 'Group Info'}</h2>
                <button
                    onClick={onClose}
                    className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {isPrivate ? (
                <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-[#21262d] shrink-0 gap-3">
                    {fetchingInfo ? (
                        <div className="flex items-center gap-2 text-[#8b949e] text-sm py-4">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : privatePartner ? (
                        <>
                            <div className="w-[100px] h-[100px] rounded-3xl bg-[#2a3441] flex items-center justify-center overflow-hidden shadow-xl mb-2">
                                {privatePartner.user_profile_picture ? (
                                    <img src={getUserImageUrl(privatePartner.user_profile_picture)} alt={privatePartner.username} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-[#8b949e]" />
                                )}
                            </div>
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-[#e6edf3]">{privatePartner.username}</h2>
                                <p className="text-[13px] text-[#8b949e] mt-1">@{privatePartner.username}</p>
                            </div>
                            {privatePartner.user_bio && (
                                <div className="w-full mt-6 bg-[#0d1117] p-4 rounded-xl border border-white/5">
                                    <p className="text-[11px] font-bold text-[#8b949e] tracking-widest uppercase mb-3 text-left">Bio</p>
                                    <p className="text-[14px] text-[#cdd9f0] leading-relaxed text-left">
                                        {privatePartner.user_bio}
                                    </p>
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
                        {/* Avatar dengan edit button */}
                        <div className="relative w-[104px] h-[104px] group/avatar mb-4">
                            <div className="w-full h-full rounded-[28px] bg-[#2a3441] flex items-center justify-center overflow-hidden shadow-xl border border-white/5">
                                {roomPicture ? (
                                    <img src={roomPicture} alt={roomName} className="w-full h-full object-cover" />
                                ) : (
                                    <Users size={40} className="text-[#8b949e]" />
                                )}
                            </div>
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => pictureInputRef.current?.click()}
                                        className="absolute inset-0 rounded-[28px] bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                    >
                                        <Pencil size={20} className="text-white" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={pictureInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setPreviewPicture({ file, url: URL.createObjectURL(file) });
                                            }
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        {/* Name dengan edit button */}
                        {editingName ? (
                            <div className="flex items-center gap-2 mb-1.5">
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="bg-[#0d1117] border border-blue-500/50 rounded-lg px-3 py-1.5 text-[#e6edf3] text-[15px] font-bold outline-none"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleUpdateRoom('name', editName);
                                        if (e.key === 'Escape') setEditingName(false);
                                    }}
                                />
                                <button
                                    onClick={() => handleUpdateRoom('name', editName)}
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
                            {totalMemberCount !== null
                                ? `${totalMemberCount} members • ${activeMemberCount ?? 0} online`
                                : 'Loading...'}
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
                                        onClick={() => handleUpdateRoom('description', editDesc)}
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
                                const isOnline = member.user_id === user?.id; // Stub logic to match design slightly
                                return (
                                    <div key={member.user_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <div className="relative">
                                                <div className="w-[42px] h-[42px] rounded-full overflow-hidden">
                                                    {member.user_profile_picture ? (
                                                        <img src={getUserImageUrl(member.user_profile_picture)} alt={member.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-[#2a3441] flex items-center justify-center text-[#cdd9f0] font-bold text-[15px]">
                                                            {member.username?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute bottom-0 right-0 w-[12px] h-[12px] rounded-full border-[2.5px] border-[#161b22] ${isOnline ? 'bg-green-500' : 'bg-[#4b5563]'}`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[15px] font-medium text-[#e6edf3] leading-tight mb-0.5">
                                                    {member.username}
                                                </span>
                                                <span className={`text-[12px] ${isOnline ? 'text-green-500' : 'text-[#8b949e]'}`}>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                        {member.role === 'admin' && (
                                            <span className="text-[11px] text-[#8b949e] bg-[#21262d] px-2 py-1 rounded-[6px] font-medium">Admin</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button className="mt-6 w-full py-2.5 rounded-xl border border-dashed border-white/15 text-[#8b949e] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/5 hover:text-[#e6edf3] hover:border-white/30 transition-all">
                            <UserPlus size={18} /> Add Member
                        </button>
                    </div>

                    {/* Shared Media Placeholders */}
                    <div className="flex flex-col p-6 border-b border-[#21262d] shrink-0">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase">Shared Media</h3>
                            <button className="text-blue-500 text-[12px] hover:text-blue-400 font-medium">View All</button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 aspect-square rounded-[14px] bg-[#eef5ef] bg-opacity-5 flex items-center justify-center overflow-hidden border border-white/5 p-2">
                                <div className="w-full h-full relative">
                                    <div className="absolute top-2 left-2 w-3 h-3 bg-[#4b7a63] rounded-full"></div>
                                    <div className="absolute bottom-2 left-4 w-4 h-4 bg-[#7ab89b] rounded-full blur-[1px]"></div>
                                    <div className="absolute top-4 right-2 w-5 h-5 bg-[#2c4e3f] rounded-full"></div>
                                    <div className="absolute top-3 left-3 w-10 h-[1px] bg-[#4b7a63] rotate-45 origin-left"></div>
                                    <div className="absolute top-5 right-4 w-6 h-[1px] bg-[#7ab89b] -rotate-45 origin-left"></div>
                                </div>
                            </div>
                            <div className="flex-1 aspect-square rounded-[14px] bg-[#455c56] bg-opacity-20 flex items-center justify-center overflow-hidden border border-white/5 p-2">
                                <div className="w-full h-full relative opacity-70">
                                    <div className="absolute top-1 left-3 w-4 h-4 bg-[#6e9a8f] rounded-full"></div>
                                    <div className="absolute bottom-3 right-2 w-3 h-3 bg-[#94c3b7] rounded-full"></div>
                                    <div className="absolute bottom-1 left-2 w-2 h-2 bg-[#4b6d64] rounded-full"></div>
                                    <div className="absolute top-2 left-4 w-8 h-[1px] bg-[#6e9a8f] rounded-full origin-left rotate-[30deg]"></div>
                                    <div className="absolute bottom-3 right-3 w-6 h-[1px] bg-[#94c3b7] rounded-full origin-left -rotate-[40deg]"></div>
                                </div>
                            </div>
                            <div className="flex-1 aspect-square rounded-[14px] bg-[#21262d] flex items-center justify-center text-[#8b949e] text-[13px] font-medium border border-white/5 hover:bg-[#2a3038] cursor-pointer transition-colors">
                                +12
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="flex flex-col p-6 shrink-0">
                        <h3 className="text-[11px] font-bold text-[#8b949e] tracking-[0.1em] uppercase mb-5">Settings</h3>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
                                <div className="flex items-center gap-3.5 text-[#e6edf3] text-[14px] font-medium">
                                    <Bell size={18} className="text-[#8b949e]" /> Mute Notifications
                                </div>
                                <div className="w-[36px] h-[20px] bg-[#2a3038] rounded-full relative cursor-pointer border border-white/5">
                                    <div className="w-[14px] h-[14px] bg-[#8b949e] rounded-full absolute top-[2px] left-[2px] shadow-sm"></div>
                                </div>
                            </div>
                            <button className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#e6edf3] text-[14px] font-medium hover:bg-white/5 transition-all">
                                <Star size={18} className="text-[#8b949e]" /> Add to Favorites
                            </button>
                            <button className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all mt-1">
                                <AlertTriangle size={18} /> Report Group
                            </button>
                            <button onClick={() => handleRoomAction('leave')} disabled={actionLoading} className="flex items-center p-2.5 -mx-2.5 rounded-xl gap-3.5 text-[#f85149] text-[14px] font-medium hover:bg-red-500/10 transition-all disabled:opacity-50">
                                <LogOut size={18} /> Leave Group
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
