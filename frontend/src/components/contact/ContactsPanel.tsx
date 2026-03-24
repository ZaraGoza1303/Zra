import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Users, Loader2, Plus, ChevronDown, UserCheck } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import UserDetailDrawer from './UserDetailDrawer';
import RequestCard from './cards/RequestCard';
import FriendCard from './cards/FriendCard';
import AddContactModal from './AddContactModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { SearchedUser, FriendRequest, FriendAction, ContactsPanelProps } from '../../types/contacts';
import { useToastStore } from '../../store/toastStore';

type UISection = 'all' | 'online' | 'requests';

export default function ContactsPanel({
    isVisible,
    onOpenDM,
    onlineUserIds = new Set(),
    friendRequestNotif = 0,
    friendAcceptedNotif = 0,
    setFriendRequestNotif,
    setFriendAcceptedNotif
}: ContactsPanelProps) {
    const { } = useAuthStore();
    const [activeSection, setActiveSection] = useState<UISection>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [friends, setFriends] = useState<SearchedUser[]>([]);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [userToUnfriend, setUserToUnfriend] = useState<SearchedUser | null>(null);

    const { showToast } = useToastStore();

    // Local filter for friends based on search query
    const filteredFriends = useMemo(() => {
        let list = friends;
        if (searchQuery.trim()) {
            list = list.filter(f =>
                (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (activeSection === 'online') {
            return list.filter(f => onlineUserIds.has(f.id));
        }
        return list;
    }, [friends, activeSection, onlineUserIds, searchQuery]);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await apiCall<{ data: FriendRequest[] }>('/user/list-friend-requests', { method: 'GET' });
            const data = res.data || [];
            setFriendRequests(data);

            // Only sync global count if NOT viewing the requests tab
            // and NOT in the process of marking them as read.
            if (setFriendRequestNotif && activeSection !== 'requests') {
                setFriendRequestNotif(data.length);
            }
        } catch (err) {
            console.error('Failed to fetch friend requests:', err);
            setFriendRequests([]);
        }
    }, [setFriendRequestNotif, activeSection]);

    const fetchFriends = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiCall<{ data: SearchedUser[] }>('/user/list-friend', { method: 'GET' });
            setFriends(res.data || []);
        } catch (err) {
            console.error('Failed to fetch friends:', err);
            setFriends([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRefresh = useCallback(() => {
        fetchRequests();
        fetchFriends();
    }, [fetchRequests, fetchFriends]);

    useEffect(() => {
        if (isVisible) {
            handleRefresh();
        }
    }, [isVisible, handleRefresh]);

    // Trigger refresh if notifications change from outside (websocket)
    // Only if count increases (new request) or we are not on requests tab
    useEffect(() => {
        if (isVisible && friendRequestNotif > friendRequests.length) {
            fetchRequests();
        }
    }, [isVisible, friendRequestNotif, friendRequests.length, fetchRequests]);

    // Mark notifications as read when switching to relevant tabs
    useEffect(() => {
        const canMarkRequests = activeSection === 'requests' && friendRequestNotif > 0;
        const canMarkAccepted = (activeSection === 'all' || activeSection === 'online') && friendAcceptedNotif > 0;

        if (isVisible && (canMarkRequests || canMarkAccepted)) {
            const markAsRead = async () => {
                try {
                    await apiCall('/user/read-notifications', { method: 'PUT' });
                    // Explicitly set BOTH to 0 as backend clears all
                    if (setFriendRequestNotif) setFriendRequestNotif(0);
                    if (setFriendAcceptedNotif) setFriendAcceptedNotif(0);
                } catch (err) {
                    console.error('Failed to mark notifications as read:', err);
                }
            };
            markAsRead();
        }
    }, [isVisible, activeSection, friendRequestNotif, friendAcceptedNotif, setFriendRequestNotif, setFriendAcceptedNotif]);

    const handleApprove = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/accept-friend-requests/${targetId}`, { method: 'PUT' });
            setFriendRequests(prev => {
                const updated = prev.filter(u => u.id !== targetId);
                if (setFriendRequestNotif) setFriendRequestNotif(updated.length);
                return updated;
            });
            fetchFriends();
            if (setFriendAcceptedNotif) setFriendAcceptedNotif(prev => (typeof prev === 'number' ? prev + 1 : 1));
            showToast('Friend request accepted!');
        } catch (err: any) {
            showToast(err.message || 'Failed to accept', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/reject-friend-requests/${targetId}`, { method: 'DELETE' });
            setFriendRequests(prev => {
                const updated = prev.filter(u => u.id !== targetId);
                if (setFriendRequestNotif) setFriendRequestNotif(updated.length);
                return updated;
            });
            showToast('Request declined.');
        } catch (err: any) {
            showToast(err.message || 'Failed to reject', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnfriend = (targetId: number) => {
        const user = friends.find(f => f.id === targetId);
        if (user) {
            setUserToUnfriend(user);
        }
    };

    const confirmUnfriend = async () => {
        if (!userToUnfriend) return;
        const targetId = userToUnfriend.id;
        setActionLoading(targetId);
        try {
            await apiCall(`/user/unfriend/${targetId}`, { method: 'DELETE' });
            setFriends(prev => prev.filter(u => u.id !== targetId));
            showToast('Unfriended successfully.');
        } catch (err: any) {
            showToast(err.message || 'Failed to unfriend', 'error');
        } finally {
            setActionLoading(null);
            setUserToUnfriend(null);
        }
    };

    const handleFriendAction = (userId: number, action: FriendAction) => {
        if (action === 'approve') handleApprove(userId);
        if (action === 'reject') handleReject(userId);
    };

    const handleDirectMessage = (targetId: number, targetUser?: SearchedUser) => {
        const target = targetUser || selectedUser;
        if (!target) return;
        onOpenDM(`pending:${targetId}`, target.name || target.username || '', target.profile_picture, targetId);
        setSelectedUser(null);
    };

    if (!isVisible) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] overflow-hidden animate-fade-in relative">
            {selectedUser && (
                <UserDetailDrawer
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onFriendAction={handleFriendAction}
                    onUnfriend={handleUnfriend}
                    onDirectMessage={handleDirectMessage}
                    actionLoading={actionLoading}
                    dmLoading={false}
                />
            )}

            <AddContactModal
                isOpen={isAddContactModalOpen}
                onClose={() => setIsAddContactModalOpen(false)}
                onRefreshFriends={handleRefresh}
                onDirectMessage={(id, u) => {
                    handleDirectMessage(id, u);
                    setIsAddContactModalOpen(false);
                }}
            />

            <ConfirmDialog
                isOpen={!!userToUnfriend}
                title="Unfriend Contact"
                description={`Are you sure you want to remove ${userToUnfriend?.name || 'this contact'} from your friends list?`}
                confirmLabel="Unfriend"
                cancelLabel="Cancel"
                variant="danger"
                loading={actionLoading === userToUnfriend?.id}
                onConfirm={confirmUnfriend}
                onCancel={() => setUserToUnfriend(null)}
            />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto px-10 py-12 custom-scrollbar">

                {/* HEADER SECTION */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-[#e6edf3] mb-2">Contacts</h1>
                        <p className="text-[#8b949e]">Connect with your friends</p>
                    </div>
                    <button
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-xl transition-all shadow-lg text-sm"
                    >
                        <Plus size={18} />
                        Add Contact
                    </button>
                </div>

                {/* SEARCH BAR SECTION (LOCAL FILTER) */}
                <div className="relative mb-8 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8b949e] group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Filter friends by username"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-[#111318] border border-white/5 rounded-2xl text-[#e6edf3] placeholder-[#8b949e] outline-none focus:border-blue-500/40 transition-all"
                    />
                </div>

                {/* TABS SECTION */}
                <div className="flex items-center gap-8 border-b border-white/5 mb-8">
                    <button
                        onClick={() => setActiveSection('all')}
                        className={`pb-4 px-1 text-sm font-semibold transition-all relative ${activeSection === 'all' ? 'text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
                    >
                        <div className="flex items-center gap-2">
                            All Contacts
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeSection === 'all' ? 'bg-[#1c2128] text-[#e6edf3]' : 'bg-transparent text-[#8b949e]'}`}>
                                {friends.length}
                            </span>
                        </div>
                        {activeSection === 'all' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#e6edf3] rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveSection('online')}
                        className={`pb-4 px-1 text-sm font-semibold transition-all relative ${activeSection === 'online' ? 'text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
                    >
                        <div className="flex items-center gap-2">
                            Online
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeSection === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'text-[#8b949e]'}`}>
                                {friends.filter(f => onlineUserIds.has(f.id)).length}
                            </span>
                        </div>
                        {activeSection === 'online' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#e6edf3] rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveSection('requests')}
                        className={`pb-4 px-1 text-sm font-semibold transition-all relative ${activeSection === 'requests' ? 'text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
                    >
                        <div className="flex items-center gap-2">
                            Requests
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeSection === 'requests' || friendRequests.length > 0 ? 'bg-blue-500/10 text-blue-500' : 'text-[#8b949e]'}`}>
                                {friendRequests.length}
                            </span>
                        </div>
                        {activeSection === 'requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#e6edf3] rounded-full" />}
                    </button>
                </div>

                {/* LIST SECTIONS */}
                <div className="space-y-10 pb-20">

                    {activeSection !== 'requests' ? (
                        <div className="animate-fade-in">
                            <h2 className="text-[11px] font-bold text-[#8b949e] uppercase tracking-[0.1em] mb-4">
                                {searchQuery.trim() ? 'Search Results' : activeSection === 'online' ? 'Online Friends' : 'All Contacts'}
                            </h2>

                            {loading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#8b949e]">
                                    <Loader2 size={32} className="animate-spin opacity-20" />
                                    <span className="text-sm">Loading contacts...</span>
                                </div>
                            ) : filteredFriends.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-[#1c2128] flex items-center justify-center text-[#8b949e]">
                                        <Users size={32} className="opacity-20" />
                                    </div>
                                    <div className="max-w-xs">
                                        <p className="text-[#e6edf3] font-medium">No contacts found</p>
                                        <p className="text-sm text-[#8b949e] mt-1">
                                            {searchQuery.trim()
                                                ? `No friends matching "${searchQuery}"`
                                                : activeSection === 'online'
                                                    ? "None of your friends are online right now."
                                                    : "You don't have any contacts yet."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-1">
                                    {filteredFriends.map(f => (
                                        <FriendCard
                                            key={f.id}
                                            user={f}
                                            isOnline={onlineUserIds.has(f.id)}
                                            onViewDetail={() => setSelectedUser(f)}
                                            onStartChat={() => handleDirectMessage(f.id, f)}
                                            onUnfriend={handleUnfriend}
                                        />
                                    ))}

                                    {!searchQuery.trim() && filteredFriends.length > 20 && (
                                        <button className="w-full flex items-center justify-center gap-2 py-6 text-sm font-semibold text-[#8b949e] hover:text-[#e6edf3] transition-colors group">
                                            <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                                            Show more contacts
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <h2 className="text-[11px] font-bold text-[#8b949e] uppercase tracking-[0.1em] mb-4">Pending Requests</h2>
                            {friendRequests.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-[#1c2128] flex items-center justify-center text-[#8b949e]">
                                        <UserCheck size={32} className="opacity-20" />
                                    </div>
                                    <div className="max-w-xs">
                                        <p className="text-[#e6edf3] font-medium">No pending requests</p>
                                        <p className="text-sm text-[#8b949e] mt-1">When someone sends you a friend request, it will appear here.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {friendRequests.map(req => (
                                        <RequestCard
                                            key={req.id}
                                            user={req}
                                            actionLoading={actionLoading}
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                            onViewDetail={() => setSelectedUser({ ...req, friendship_status: 'pending_received' })}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}