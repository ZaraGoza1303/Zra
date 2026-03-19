import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getUserImageUrl, apiCall } from '../../services/api';
import { User, Pencil, Trash2, Check, X as XIcon } from 'lucide-react';
import type { Message } from '../../types/chat';
import ConfirmDialog from '../ui/ConfirmDialog';

interface MessageListProps {
    roomId: string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    messagesContainerRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onRetry: (localId: string, content: string) => void;
    isPrivate: boolean;
    onReply: (msg: Message) => void;
}

export default function MessageList({
    roomId,
    messagesEndRef,
    messagesContainerRef,
    onScroll,
    onRetry,
    isPrivate,
    onReply,
}: MessageListProps) {
    const { user } = useAuthStore();
    const { messages, setMessages, fetchingHistory, loadingMore } = useChatStore();
    const [expandedMessages, setExpandedMessages] = React.useState<Set<string>>(new Set());
    const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editContent, setEditContent] = React.useState('');
    const [editCaption, setEditCaption] = React.useState('');
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [actionLoading, setActionLoading] = React.useState(false);
    const editInputRef = React.useRef<HTMLInputElement>(null);

    // ─── Select mode ──────────────────────────────────────────────────────────
    const [selectMode, setSelectMode] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
    const [multiDeleting, setMultiDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = React.useState(false);
    const pendingDeleteId = React.useRef<string | null>(null);

    const enterSelectMode = (msgId: string) => {
        setSelectMode(true);
        setSelectedIds(new Set([msgId]));
        setEditingId(null);
        setDeletingId(null);
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const toggleSelect = (msgId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(msgId) ? next.delete(msgId) : next.add(msgId);
            return next;
        });
    };

    const submitMultiDelete = async () => {
        if (multiDeleting || selectedIds.size === 0) return;
        setMultiDeleting(true);
        try {
            await apiCall('/room/multiple-messages', {
                method: 'DELETE',
                body: JSON.stringify({ message_ids: Array.from(selectedIds) }),
                headers: { 'Content-Type': 'application/json' },
            });
            setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
            exitSelectMode();
            setShowMultiDeleteConfirm(false);
        } catch (e) {
            console.error('Failed to delete messages', e);
        } finally {
            setMultiDeleting(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedMessages(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const getDateLabel = (timestamp: string) => {
        const d = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'TODAY';
        if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    const formatMsgTime = (timestamp: string) => {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // ─── Edit ─────────────────────────────────────────────────────────────────
    const startEdit = (msg: Message) => {
        setEditingId(msg.id);
        setEditContent(msg.content);
        setEditCaption(msg.caption || '');
        setDeletingId(null);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
        setEditCaption('');
    };

    const submitEdit = async (msg: Message) => {
        if (actionLoading) return;
        if (msg.type !== 'image' && !editContent.trim()) return;
        setActionLoading(true);
        try {
            const formData = new FormData();
            if (msg.type === 'image') {
                formData.append('caption', editCaption);
            } else {
                formData.append('content', editContent.trim());
            }
            await apiCall(`/room/${msg.id}/message`, { method: 'PUT', body: formData });
            setMessages(prev => prev.map(m => m.id === msg.id
                ? {
                    ...m,
                    content: msg.type === 'image' ? m.content : editContent.trim(),
                    caption: msg.type === 'image' ? editCaption : m.caption,
                }
                : m
            ));
            cancelEdit();
        } catch (e) {
            console.error('Failed to edit message', e);
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────────────
    const confirmDelete = (msgId: string) => {
        pendingDeleteId.current = msgId;
        setShowDeleteConfirm(true);
        setEditingId(null);
    };
    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        pendingDeleteId.current = null;
    };

    const submitDelete = async () => {
        const msgId = pendingDeleteId.current;
        if (!msgId || actionLoading) return;
        setActionLoading(true);
        try {
            await apiCall(`/room/${msgId}/message`, { method: 'DELETE' });
            setMessages(prev => prev.filter(m => m.id !== msgId));
            setShowDeleteConfirm(false);
            pendingDeleteId.current = null;
        } catch (e) {
            console.error('Failed to delete message', e);
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Sub-components ───────────────────────────────────────────────────────



    const ActionBtns = ({ msg, isMe }: { msg: Message; isMe: boolean }) => {
        const [showDropdown, setShowDropdown] = React.useState(false);
        const dropdownRef = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            const handler = (e: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                    setShowDropdown(false);
                }
            };
            document.addEventListener('mousedown', handler);
            return () => document.removeEventListener('mousedown', handler);
        }, []);

        return (
            <div className={`absolute -top-3 flex items-center gap-1 transition-opacity z-10 ${selectMode ? 'hidden' : 'opacity-0 group-hover:opacity-100'}
                ${isMe ? 'right-2' : 'left-2'}`}>
                {/* Reply */}
                <button onClick={() => onReply(msg)}
                    className="p-1 rounded-full bg-[#1c2128] border border-white/10 text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                    </svg>
                </button>

                {/* Dropdown edit/delete — hanya milik sendiri */}
                {isMe && msg.id && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(prev => !prev)}
                            className="p-1 rounded-full bg-[#1c2128] border border-white/10 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                        >
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                                <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                            </svg>
                        </button>

                        {showDropdown && (
                            <div className={`absolute top-6 z-30 w-32 bg-[#1c2128] border border-white/10 rounded-xl shadow-xl overflow-hidden
                                ${isMe ? 'right-0' : 'left-0'}`}>
                                {msg.type !== 'sticker' && (
                                    <button
                                        onClick={() => { startEdit(msg); setShowDropdown(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#e6edf3] hover:bg-white/5 transition-colors"
                                    >
                                        <Pencil size={12} className="text-blue-400" />
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => { enterSelectMode(msg.id); setShowDropdown(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#e6edf3] hover:bg-white/5 transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#8b949e]" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" />
                                    </svg>
                                    Select
                                </button>
                                <button
                                    onClick={() => { confirmDelete(msg.id); setShowDropdown(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
                                >
                                    <Trash2 size={12} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const ReplyPreview = ({ replyTo, isMe }: { replyTo: Message['reply_to']; isMe: boolean }) => {
        if (!replyTo) return null;
        return (
            <div className={`flex items-stretch gap-2 mb-2 rounded-md overflow-hidden text-xs
                ${isMe ? 'bg-blue-950/40' : 'bg-white/[0.07]'}`}>
                <div className="w-[3px] bg-blue-400 shrink-0" />
                <div className="px-3 py-2 min-w-0">
                    <span className="text-blue-400 font-semibold block mb-0.5 pb-1">{replyTo.username}</span>
                    {replyTo.type === 'sticker' ? (
                        <img src={replyTo.content} alt="sticker" className="w-10 h-10 object-contain" />
                    ) : replyTo.type === 'image' ? (
                        <img src={replyTo.content} alt="image" className="w-16 h-12 object-cover rounded-sm" />
                    ) : (
                        <p className={`truncate italic ${isMe ? 'text-[#cdd9f0]/60' : 'text-[#8b949e]'}`}>
                            {replyTo.content}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    const renderMessages = () => {
        const elements: React.ReactNode[] = [];
        let lastDateLabel = '';

        messages.forEach((msg, idx) => {
            // Silent — sembunyikan broadcast event dari BE
            if (msg.type === 'delete-message' || msg.type === 'update-message') return;

            const isSystem = msg.type === 'join' || msg.type === 'leave' || msg.type === 'system' || msg.type === 'update-room';

            if (!isSystem && msg.time_stamp) {
                const label = getDateLabel(msg.time_stamp);
                if (label !== lastDateLabel) {
                    lastDateLabel = label;
                    elements.push(
                        <div key={`sep-${idx}`} className="flex items-center justify-center my-3">
                            <span className="px-4 py-1 text-[10px] font-semibold tracking-widest text-[#8b949e] bg-[#161b22] rounded-full border border-white/5">
                                {label}
                            </span>
                        </div>
                    );
                }
            }

            if (isSystem) {
                elements.push(
                    <div key={msg.id || idx} className="flex justify-center my-1">
                        <span className="px-4 py-1.5 rounded-full text-xs text-[#8b949e] bg-white/5">
                            {msg.content}
                        </span>
                    </div>
                );
                return;
            }

            const isMe = msg.user_id === user?.id;
            const isSticker = msg.type === 'sticker';
            const isImage = msg.type === 'image';
            const isEditingThis = editingId === msg.id;

            elements.push(
                <div
                    key={msg.local_id || msg.id || idx}
                    className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}
                        ${selectMode ? 'cursor-pointer' : ''}
                        ${selectMode && msg.id && selectedIds.has(msg.id) ? (isMe ? 'bg-blue-500/10' : 'bg-blue-500/10') : ''}
                        rounded-xl transition-colors px-1`}
                    onClick={selectMode && msg.id ? () => toggleSelect(msg.id) : undefined}
                >
                    {/* Checkbox di select mode */}
                    {selectMode && msg.id && (
                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                            ${selectedIds.has(msg.id) ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
                            {selectedIds.has(msg.id) && (
                                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    )}

                    {/* Avatar */}
                    {!isMe && !isPrivate && (
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-[2px]">
                            {msg.profile_picture ? (
                                <img src={getUserImageUrl(msg.profile_picture)} alt={msg.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#30363d] flex items-center justify-center text-[#8b949e]">
                                    <User size={18} strokeWidth={2} />
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`flex flex-col max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && !isPrivate && (
                            <span className="text-xs text-[#8b949e] font-medium mb-1 ml-1">{msg.username}</span>
                        )}

                        {/* ── STICKER ── */}
                        {isSticker && (
                            msg.reply_to ? (
                                <div className={`relative flex flex-col gap-3 items-center group px-4 pt-2.5 pb-2.5 rounded-2xl
                                    ${isMe ? 'bg-[#1d3a6e] rounded-br-sm' : 'bg-[#1c2128] rounded-bl-sm border border-white/5'}`}>
                                    <ActionBtns msg={msg} isMe={isMe} />
                                    <ReplyPreview replyTo={msg.reply_to} isMe={isMe} />
                                    <img src={msg.content} alt="sticker" className="w-40 h-40 object-contain drop-shadow-lg" />
                                </div>
                            ) : (
                                <div className="relative group">
                                    <ActionBtns msg={msg} isMe={isMe} />
                                    <img src={msg.content} alt="sticker" className="w-44 h-44 object-contain drop-shadow-lg" />
                                </div>
                            )
                        )}

                        {/* ── IMAGE ── */}
                        {isImage && (
                            <div className="relative group max-w-[260px]">
                                <ActionBtns msg={msg} isMe={isMe} />
                                <div className={`overflow-hidden
                                    ${isMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}
                                    ${isMe ? 'bg-[#1d3a6e]' : 'bg-[#1c2128] border border-white/5'}`}>

                                    {msg.reply_to && (
                                        <div className="px-2 pt-2">
                                            <ReplyPreview replyTo={msg.reply_to} isMe={isMe} />
                                        </div>
                                    )}

                                    <div className={`relative ${msg.reply_to ? 'px-2 py-2' : ''}`}>
                                        <img
                                            src={msg.content}
                                            alt="image"
                                            onClick={() => setLightboxUrl(msg.content)}
                                            className="w-full max-h-[320px] rounded-sm object-cover cursor-zoom-in hover:brightness-90 transition-all"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '';
                                                (e.target as HTMLImageElement).alt = 'Failed to load image';
                                            }}
                                        />
                                        {msg.status === 'pending' && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Caption */}
                                    {isEditingThis ? (
                                        <div className="px-3 py-2 flex items-center gap-2">
                                            <input
                                                ref={editInputRef}
                                                value={editCaption}
                                                onChange={e => setEditCaption(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') submitEdit(msg);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                placeholder="Edit caption..."
                                                className="flex-1 bg-transparent text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none border-b border-blue-500/50"
                                            />
                                            <button onClick={() => submitEdit(msg)} disabled={actionLoading}
                                                className="text-blue-400 hover:text-blue-300 disabled:opacity-40 shrink-0">
                                                <Check size={14} />
                                            </button>
                                            <button onClick={cancelEdit} className="text-[#8b949e] hover:text-[#e6edf3] shrink-0">
                                                <XIcon size={14} />
                                            </button>
                                        </div>
                                    ) : msg.caption ? (
                                        (() => {
                                            const captionKey = `caption_${msg.local_id || msg.id || idx}`;
                                            const isExpanded = expandedMessages.has(captionKey);
                                            const isLong = msg.caption.length > 300;
                                            const displayCaption = isLong && !isExpanded ? msg.caption.slice(0, 300) + '...' : msg.caption;
                                            return (
                                                <div className="px-3 py-2">
                                                    <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap
                                                    ${isMe ? 'text-[#cdd9f0]' : 'text-[#e6edf3]'}`}>
                                                        {displayCaption}
                                                    </p>
                                                    {isLong && (
                                                        <button onClick={() => toggleExpand(captionKey)}
                                                            className={`text-xs mt-1 font-medium hover:underline ${isMe ? 'text-blue-300' : 'text-blue-400'}`}>
                                                            {isExpanded ? 'Show less' : 'Read more'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {/* ── CHAT (text) ── */}
                        {!isSticker && !isImage && (
                            <div className={`relative group px-4 pt-2.5 pb-2.5 rounded-2xl text-sm leading-relaxed break-words
                                ${isMe ? 'bg-[#1d3a6e] text-[#cdd9f0] rounded-br-sm' : 'bg-[#1c2128] text-[#e6edf3] rounded-bl-sm border border-white/5'}`}>
                                <ActionBtns msg={msg} isMe={isMe} />
                                <ReplyPreview replyTo={msg.reply_to} isMe={isMe} />

                                {isEditingThis ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            ref={editInputRef}
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') submitEdit(msg);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            className="flex-1 bg-transparent text-sm text-[#e6edf3] outline-none border-b border-blue-500/50"
                                        />
                                        <button onClick={() => submitEdit(msg)} disabled={actionLoading || !editContent.trim()}
                                            className="text-blue-400 hover:text-blue-300 disabled:opacity-40 shrink-0">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={cancelEdit} className="text-[#8b949e] hover:text-[#e6edf3] shrink-0">
                                            <XIcon size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    (() => {
                                        const msgKey = msg.local_id || msg.id || String(idx);
                                        const isExpanded = expandedMessages.has(msgKey);
                                        const isLong = msg.content.length > 300;
                                        const displayContent = isLong && !isExpanded ? msg.content.slice(0, 300) + '...' : msg.content;
                                        return (
                                            <>
                                                <div className="mt-1 whitespace-pre-wrap break-all">{displayContent}</div>
                                                {isLong && (
                                                    <button onClick={() => toggleExpand(msgKey)}
                                                        className={`text-xs mt-1 font-medium ${isMe ? 'text-blue-300' : 'text-blue-400'} hover:underline`}>
                                                        {isExpanded ? 'Show less' : 'Read more'}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        )}

                        {/* Timestamp & status */}
                        <div className="flex items-center gap-1 mt-1 mx-1">
                            {msg.time_stamp && (
                                <span className="text-[10px] text-[#8b949e]">{formatMsgTime(msg.time_stamp)}</span>
                            )}
                            {isMe && msg.status && isPrivate && (
                                <span className="inline-flex items-center">
                                    {msg.status === 'pending' && (
                                        <svg className="animate-spin w-2.5 h-2.5 text-[#8b949e]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    )}
                                    {msg.status === 'sent' && (
                                        <svg viewBox="0 0 16 11" className="w-3 h-2.5" fill="none">
                                            <path d="M1 5.5L5.5 10L15 1" stroke="#8b949e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    {msg.status === 'read' && (
                                        <svg viewBox="0 0 20 11" className="w-4 h-2.5" fill="none">
                                            <path d="M1 5.5L5.5 10L15 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 5.5L10.5 10L20 1" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    {msg.status === 'failed' && (
                                        <button onClick={() => msg.local_id && onRetry(msg.local_id, msg.content)}
                                            className="text-red-400 underline hover:text-red-300 cursor-pointer text-[10px]">
                                            Retry
                                        </button>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        });

        return elements;
    };

    return (
        <div className="relative flex flex-col flex-1 min-h-0">
            <div ref={messagesContainerRef} onScroll={onScroll} className={`flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 ${selectMode ? "pb-16" : ""}`}>
                {loadingMore && (
                    <div className="flex justify-center py-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {fetchingHistory ? (
                    <div className="m-auto flex flex-col items-center gap-3 text-[#8b949e]">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading messages...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="m-auto text-[#8b949e] text-sm text-center">
                        <p>No messages yet.</p>
                        <p className="text-xs mt-1 opacity-70">Start the conversation! 👋</p>
                    </div>
                ) : renderMessages()}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Select mode bottom bar ── */}
            {selectMode && (
                <div className="absolute bottom-0 left-0 right-0 z-30 px-4 py-3 bg-[#1c2128] border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={exitSelectMode} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                        <span className="text-sm text-[#e6edf3] font-medium">
                            {selectedIds.size} selected
                        </span>
                    </div>
                    <button
                        onClick={() => setShowMultiDeleteConfirm(true)}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30
                            text-red-400 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={14} />
                        {`Delete${selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}`}
                    </button>
                </div>
            )}

            {/* ── Single delete confirm ── */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Message"
                description="Are you sure you want to delete this message? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={actionLoading}
                onConfirm={submitDelete}
                onCancel={cancelDelete}
            />

            {/* ── Multi delete confirm ── */}
            <ConfirmDialog
                isOpen={showMultiDeleteConfirm}
                title={`Delete ${selectedIds.size} Message${selectedIds.size > 1 ? 's' : ''}`}
                description={`Are you sure you want to delete ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`}
                confirmLabel="Delete All"
                variant="danger"
                loading={multiDeleting}
                onConfirm={submitMultiDelete}
                onCancel={() => setShowMultiDeleteConfirm(false)}
            />

            {/* Lightbox */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setLightboxUrl(null)}>
                    <button onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                    <img src={lightboxUrl} alt="preview" onClick={e => e.stopPropagation()}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
                </div>
            )}
        </div>
    );
}