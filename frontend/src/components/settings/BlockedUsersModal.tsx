import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, User } from 'lucide-react';
import { getBlockedUsers, getUserImageUrl, type BlockedUser as BlockedUserType } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { apiCall } from '../../services/api';
import ConfirmDialog from '../ui/ConfirmDialog';

interface BlockedUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUnblock: (userId: number) => void;
}

export default function BlockedUsersModal({ isOpen, onClose, onUnblock }: BlockedUsersModalProps) {
    const { showToast } = useToastStore();
    const [users, setUsers] = useState<BlockedUserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [unblockingId, setUnblockingId] = useState<number | null>(null);
    const [confirmUnblock, setConfirmUnblock] = useState<number | null>(null);
    const observerRef = useRef<HTMLDivElement>(null);

    const userToUnblock = confirmUnblock !== null ? users.find(u => u.id === confirmUnblock) : null;

    const fetchUsers = useCallback(async (cursor?: number, isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await getBlockedUsers(cursor, 10);
            if (res?.data) {
                if (isLoadMore) {
                    setUsers(prev => [...prev, ...res.data]);
                } else {
                    setUsers(res.data);
                }
                setNextCursor(res.next_cursor);
            }
        } catch (err) {
            console.error('Failed to fetch blocked users:', err);
            showToast('Failed to load blocked users', 'error');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (!isOpen) {
            setUsers([]);
            setNextCursor(null);
            return;
        }
        fetchUsers();
    }, [isOpen, fetchUsers]);

    useEffect(() => {
        if (!nextCursor || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchUsers(nextCursor, true);
                }
            },
            { threshold: 0.1 }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [nextCursor, loadingMore, fetchUsers]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-[var(--border-color)] max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                        <h2 className="text-lg font-semibold">Blocked Users</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin text-[var(--accent-color)]" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-[var(--text-secondary)]">
                                    No blocked users yet
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            {user.profile_picture ? (
                                                <img
                                                    src={getUserImageUrl(user.profile_picture)}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                                    <User size={20} className="text-[var(--text-muted)]" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">@{user.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setConfirmUnblock(user.id)}
                                            disabled={unblockingId === user.id}
                                            className="text-xs text-[var(--accent-color)] hover:underline disabled:opacity-50"
                                        >
                                            {unblockingId === user.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                'Unblock'
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {loadingMore && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={20} className="animate-spin text-[var(--accent-color)]" />
                            </div>
                        )}

                        <div ref={observerRef} className="h-4" />
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmUnblock !== null}
                title="Unblock User"
                description={`Are you sure you want to unblock @${userToUnblock?.username}?`}
                confirmLabel="Unblock"
                cancelLabel="Cancel"
                variant="warning"
                loading={unblockingId !== null}
                onConfirm={async () => {
                    if (confirmUnblock !== null) {
                        setUnblockingId(confirmUnblock);
                        try {
                            await apiCall(`/user/block/${confirmUnblock}`, { method: 'DELETE' });
                            setUsers(prev => prev.filter(u => u.id !== confirmUnblock));
                            onUnblock(confirmUnblock);
                            showToast('User unblocked');
                        } catch (err: unknown) {
                            const message = err instanceof Error ? err.message : 'Failed to unblock user';
                            showToast(message, 'error');
                        } finally {
                            setUnblockingId(null);
                            setConfirmUnblock(null);
                        }
                    }
                }}
                onCancel={() => setConfirmUnblock(null)}
            />
        </>
    );
}
