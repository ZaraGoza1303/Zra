import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getUserImageUrl } from '../../services/api';
import { User } from 'lucide-react';
import type { Message } from '../../types/chat';

interface MessageListProps {
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    messagesContainerRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onRetry: (localId: string, content: string) => void;
    isPrivate: boolean;
    onReply: (msg: Message) => void;
}

export default function MessageList({
    messagesEndRef,
    messagesContainerRef,
    onScroll,
    onRetry,
    isPrivate,
    onReply
}: MessageListProps) {
    const { user } = useAuthStore();
    const { messages, fetchingHistory, loadingMore } = useChatStore();
    const [expandedMessages, setExpandedMessages] = React.useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedMessages(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Group messages by date for date separators
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

    const renderMessages = () => {
        const elements: React.ReactNode[] = [];
        let lastDateLabel = '';

        messages.forEach((msg, idx) => {
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
            elements.push(
                <div key={msg.local_id || msg.id || idx} className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
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
                        <div className={`relative group px-4 pt-2.5 pb-2.5 rounded-2xl text-sm leading-relaxed break-words
    ${isMe
                                ? 'bg-[#1d3a6e] text-[#cdd9f0] rounded-br-sm'
                                : 'bg-[#1c2128] text-[#e6edf3] rounded-bl-sm border border-white/5'
                            }`}
                        >
                            {msg.reply_to && (
                                <div className={`flex items-stretch gap-0 mb-1 rounded-md overflow-hidden text-xs cursor-pointer
        ${isMe ? 'bg-blue-950/40' : 'bg-white/[0.07]'}`}>
                                    <div className="w-[3px] bg-blue-400 shrink-0" />
                                    <div className="px-3 py-2 min-w-0">
                                        <span className="text-blue-400 font-semibold block mb-0.5">{msg.reply_to.username}</span>
                                        <p className={`truncate italic ${isMe ? 'text-[#cdd9f0]/60' : 'text-[#8b949e]'}`}>
                                            {msg.reply_to.content}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {(() => {
                                const msgKey = msg.local_id || msg.id || String(idx);
                                const isExpanded = expandedMessages.has(msgKey);
                                const isLong = msg.content.length > 300;
                                const displayContent = isLong && !isExpanded
                                    ? msg.content.slice(0, 300) + '...'
                                    : msg.content;

                                return (
                                    <>
                                        <div className="mt-1 whitespace-pre-wrap break-all">{displayContent}</div>
                                        {isLong && (
                                            <button
                                                onClick={() => toggleExpand(msgKey)}
                                                className={`text-xs mt-1 font-medium ${isMe ? 'text-blue-300' : 'text-blue-400'} hover:underline`}
                                            >
                                                {isExpanded ? 'Show less' : 'Read more'}
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                            <button
                                onClick={() => {
                                    onReply(msg);
                                }}
                                className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1c2128] border border-white/10 rounded-full p-1 text-[#8b949e] hover:text-[#e6edf3]"
                            >
                                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center gap-1 mt-1 mx-1">
                            {msg.time_stamp && (
                                <span className="text-[10px] text-[#8b949e]">
                                    {formatMsgTime(msg.time_stamp)}
                                </span>
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
                                        <button
                                            onClick={() => msg.local_id && onRetry(msg.local_id, msg.content)}
                                            className="text-red-400 underline hover:text-red-300 cursor-pointer text-[10px]"
                                        >
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
        <div
            ref={messagesContainerRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3"
        >
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
            ) : (
                renderMessages()
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
