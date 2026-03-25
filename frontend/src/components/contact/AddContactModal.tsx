import { useState, useEffect } from 'react';
import { Search, X, Loader2, UserPlus } from 'lucide-react';
import { apiCall } from '../../services/api';
import SearchUserCard from './cards/SearchUserCard';
import type { SearchedUser } from '../../types/contacts';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRefreshFriends: () => void;
    onDirectMessage: (targetId: number, targetUser: SearchedUser) => void;
}

export default function AddContactModal({ isOpen, onClose, onRefreshFriends, onDirectMessage }: AddContactModalProps) {
    const { user: currentUser } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const { showToast } = useToastStore();

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            return;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await apiCall<{ data: SearchedUser[] }>(`/user?filter=${encodeURIComponent(searchQuery)}`, { method: 'GET' });
                setSearchResults(res.data || []);
            } catch (err) {
                console.error('Failed to search users:', err);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSendRequest = async (targetId: number) => {
        setActionLoading(targetId);
        try {
            await apiCall(`/user/make-friend-requests/${targetId}`, { method: 'POST' });
            setSearchResults(prev => prev.map(u =>
                u.id === targetId ? { ...u, friendship_status: 'pending_sent' } : u
            ));
            showToast('Friend request sent!');
            onRefreshFriends();
        } catch (err: any) {
            showToast(err.message || 'Failed to send friend request', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal content */}
            <div className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Contact</h2>
                    <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Find someone by username"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-color)]/50 transition-all"
                        />
                        {searching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 size={18} className="text-blue-500 animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                        {searchResults.length > 0 ? (
                            searchResults.map(u => (
                                <SearchUserCard
                                    key={u.id}
                                    user={u}
                                    actionLoading={actionLoading}
                                    onAdd={handleSendRequest}
                                    onDirectMessage={onDirectMessage}
                                    dmLoading={false}
                                    currentUserId={currentUser?.id}
                                />
                            ))
                        ) : searchQuery.trim() && !searching ? (
                            <div className="py-12 text-center text-[var(--text-muted)]">
                                <p>No users found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-[var(--text-muted)]">
                                <UserPlus size={48} className="mx-auto mb-4 opacity-10" />
                                <p>Search for people to add them as contacts</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
