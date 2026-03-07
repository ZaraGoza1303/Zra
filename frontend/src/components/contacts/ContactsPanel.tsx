import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, Clock, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import UserDetailDrawer from './UserDetailDrawer';
import SearchUserCard from './cards/SearchUserCard';
import RequestCard from './cards/RequestCard';
import FriendCard from './cards/FriendCard';
import type { SearchedUser, FriendRequest, ActiveTab, FriendAction, ContactsPanelProps } from '../../types/contacts';

export default function ContactsPanel({ isVisible, onOpenDM }: ContactsPanelProps) {
    const { user } = useAuth();
    const [dmLoading, setDmLoading] = useState<number | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [friends, setFriends] = useState<SearchedUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [requestsLoaded, setRequestsLoaded] = useState(false);
    const [friendsLoaded, setFriendsLoaded] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (activeTab !== 'search' || !searchQuery.trim()) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await apiCall<{ data: SearchedUser[] }>(`/user?filter=${encodeURIComponent(searchQuery)}`, { method: 'GET' });
                setSearchResults(res.data || []);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await apiCall<{ data: FriendRequest[] }>('/user/list-friend-requests', { method: 'GET' });
            setFriendRequests(res.data || []);
        } catch { setFriendRequests([]); }
        finally { setRequestsLoaded(true); }
    }, []);

    const fetchFriends = useCallback(async () => {
        try {
            const res = await apiCall<{ data: SearchedUser[] }>('/user/list-friend', { method: 'GET' });
            setFriends(res.data || []);
        } catch { setFriends([]); }
        finally { setFriendsLoaded(true); }
    }, []);

    useEffect(() => {
        if (activeTab === 'requests') fetchRequests();
        if (activeTab === 'friends') fetchFriends();
    }, [activeTab]);

    const handleSendRequest = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/make-friend-requests/${targetId}`, { method: 'POST' });
            setSearchResults(prev => prev.map(u => u.id === targetId ? { ...u, friendship_status: 'pending_sent' } : u));
            if (selectedUser?.id === targetId) setSelectedUser(prev => prev ? { ...prev, friendship_status: 'pending_sent' } : null);
            showToast('Friend request sent!');
        } catch (err: any) { showToast(err.message || 'Failed to send request', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleApprove = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/accept-friend-requests/${targetId}`, { method: 'PUT' });
            setFriendRequests(prev => prev.filter(u => u.id !== targetId));
            setFriendsLoaded(false);
            if (selectedUser?.id === targetId) setSelectedUser(prev => prev ? { ...prev, friendship_status: 'friend' } : null);
            showToast('Friend request accepted! 🎉');
        } catch (err: any) { showToast(err.message || 'Failed to accept', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleReject = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/reject-friend-requests/${targetId}`, { method: 'DELETE' });
            setFriendRequests(prev => prev.filter(u => u.id !== targetId));
            if (selectedUser?.id === targetId) setSelectedUser(prev => prev ? { ...prev, friendship_status: 'none' } : null);
            showToast('Request declined.');
        } catch (err: any) { showToast(err.message || 'Failed to reject', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleUnfriend = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/unfriend/${targetId}`, { method: 'DELETE' });
            setFriends(prev => prev.filter(u => u.id !== targetId));
            setSearchResults(prev => prev.map(u => u.id === targetId ? { ...u, friendship_status: 'none' } : u));
            if (selectedUser?.id === targetId) setSelectedUser(prev => prev ? { ...prev, friendship_status: 'none' } : null);
            setFriendsLoaded(false);
            showToast('Unfriended successfully.');
        } catch (err: any) { showToast(err.message || 'Failed to unfriend', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleFriendAction = (userId: number, action: FriendAction) => {
        if (action === 'add') handleSendRequest(userId);
        if (action === 'approve') handleApprove(userId);
        if (action === 'reject') handleReject(userId);
    };

    const handleDirectMessage = async (targetId: number, targetUser?: SearchedUser) => {
        setDmLoading(targetId);
        const target = targetUser || selectedUser;
        try {
            let roomId: string | null = null;

            // 1. Cek apakah room sudah ada
            try {
                const res = await apiCall<{ data: string }>(`/room/${targetId}/private`, { method: 'GET' });
                roomId = res.data;
            } catch {
                // Room belum ada, roomId tetap null
            }

            // 2. Kalau belum ada, create dulu
            if (!roomId) {
                await apiCall(`/room/${targetId}/private`, { method: 'POST' });
                const res = await apiCall<{ data: string }>(`/room/${targetId}/private`, { method: 'GET' });
                roomId = res.data;
            }

            if (!roomId) {
                showToast('Failed to get room ID', 'error');
                return;
            }

            onOpenDM(roomId, target?.name || target?.username || '', target?.profile_picture);
            setSelectedUser(null);
        } catch (err: any) {
            showToast(err.message || 'Failed to open DM', 'error');
        } finally {
            setDmLoading(null);
        }
    };

    const tabs = [
        { key: 'search' as ActiveTab, label: 'Search', icon: <Search size={14} /> },
        { key: 'requests' as ActiveTab, label: 'Requests', icon: <Clock size={14} /> },
        { key: 'friends' as ActiveTab, label: 'Friends', icon: <Users size={14} /> },
    ];

    if (!isVisible) return null;

    return (
        <div className="relative flex flex-col w-[300px] min-w-[260px] bg-[#111318] border-r border-white/5 overflow-hidden">
            {toast && (
                <div className={`absolute top-3 left-3 right-3 z-50 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium shadow-lg
                    ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                    {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
                    {toast.msg}
                </div>
            )}

            {selectedUser && (
                <UserDetailDrawer
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onFriendAction={handleFriendAction}
                    onUnfriend={handleUnfriend}
                    onDirectMessage={handleDirectMessage}
                    actionLoading={actionLoading}
                    dmLoading={dmLoading === selectedUser.id}
                />
            )}

            <div className="px-5 pt-6 pb-4">
                <h1 className="text-xl font-bold text-[#e6edf3] mb-4">Contacts</h1>
                <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl border border-white/5">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedUser(null); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200
                                ${activeTab === tab.key ? 'bg-[#1c2128] text-[#e6edf3] shadow-sm' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
                            {tab.icon}
                            {tab.label}
                            {tab.key === 'requests' && friendRequests.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold">
                                    {friendRequests.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* SEARCH TAB */}
            {activeTab === 'search' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="px-4 pb-3">
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1c2128] rounded-xl border border-white/5 focus-within:border-blue-500/40 transition-colors">
                            <Search size={14} className="text-[#8b949e] shrink-0" />
                            <input type="text" placeholder="Search by username..." value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)} autoFocus
                                className="bg-transparent border-none text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none w-full" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#8b949e] hover:text-[#e6edf3]"><X size={13} /></button>}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2">
                        {searching ? (
                            <div className="flex items-center justify-center gap-2 py-12 text-[#8b949e] text-sm"><Loader2 size={18} className="animate-spin" /> Searching...</div>
                        ) : searchQuery && searchResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[#8b949e] gap-2"><Users size={32} className="opacity-20" /><p className="text-sm">No users found</p></div>
                        ) : !searchQuery ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[#8b949e] gap-3 px-4 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center"><Search size={24} className="opacity-30" /></div>
                                <div><p className="text-sm font-medium text-[#e6edf3] mb-1">Find People</p><p className="text-xs leading-relaxed">Search by username to connect with others</p></div>
                            </div>
                        ) : searchResults.map(u => (
                            <SearchUserCard
                                key={u.id}
                                user={u}
                                actionLoading={actionLoading}
                                onAdd={handleSendRequest}
                                onViewDetail={() => setSelectedUser(u)}
                                onDirectMessage={handleDirectMessage}
                                dmLoading={dmLoading === u.id}
                                currentUserId={user?.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
                <div className="flex-1 overflow-y-auto px-2">
                    {!requestsLoaded ? (
                        <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin text-[#8b949e]" /></div>
                    ) : friendRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[#8b949e] gap-3 px-4 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center"><Clock size={24} className="opacity-30" /></div>
                            <div><p className="text-sm font-medium text-[#e6edf3] mb-1">No Pending Requests</p><p className="text-xs">Friend requests you receive will appear here</p></div>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] text-[#8b949e] uppercase tracking-wider font-medium px-3 py-2">{friendRequests.length} pending {friendRequests.length === 1 ? 'request' : 'requests'}</p>
                            {friendRequests.map(u => <RequestCard key={u.id} user={u} actionLoading={actionLoading} onApprove={handleApprove} onReject={handleReject} onViewDetail={() => setSelectedUser({ ...u, friendship_status: 'pending_received' })} />)}
                        </>
                    )}
                </div>
            )}

            {/* FRIENDS TAB */}
            {activeTab === 'friends' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="px-4 pb-3">
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1c2128] rounded-xl border border-white/5">
                            <Search size={14} className="text-[#8b949e] shrink-0" />
                            <input type="text" placeholder="Filter friends..." className="bg-transparent border-none text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none w-full" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2">
                        {!friendsLoaded ? (
                            <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin text-[#8b949e]" /></div>
                        ) : friends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[#8b949e] gap-3 px-4 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center"><Users size={24} className="opacity-30" /></div>
                                <div><p className="text-sm font-medium text-[#e6edf3] mb-1">No Friends Yet</p><p className="text-xs">Search for people and send friend requests</p></div>
                            </div>
                        ) : (
                            <>
                                <p className="text-[11px] text-[#8b949e] uppercase tracking-wider font-medium px-3 py-2">{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</p>
                                {friends.map(u => <FriendCard key={u.id} user={u} onViewDetail={() => setSelectedUser({ ...u, friendship_status: 'friend' })} />)}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}