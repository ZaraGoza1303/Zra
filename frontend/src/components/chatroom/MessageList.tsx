import React from 'react';
import type { Message } from '../../types/chat';
import { getUserImageUrl } from '../../services/api';
import { User } from 'lucide-react';

interface MessageListProps {
    messages: Message[];
    user: { id: number } | null | undefined;
    isPrivate: boolean;
    fetchingHistory: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    messagesContainerRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    loadingMore: boolean;
}

export default function MessageList({
    messages,
    user,
    isPrivate,
    fetchingHistory,
    messagesEndRef,
    messagesContainerRef,
    onScroll,
    loadingMore
}: MessageListProps) {
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
            const isSystem = msg.type === 'join' || msg.type === 'leave' || msg.type === 'system';

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
                <div key={msg.id || idx} className={`flex items-center gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for others */}
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
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                            ${isMe
                                ? 'bg-[#1d3a6e] text-[#cdd9f0] rounded-br-sm'
                                : 'bg-[#1c2128] text-[#e6edf3] rounded-bl-sm border border-white/5'
                            }`}
                        >
                            {msg.content}
                        </div>
                        {msg.time_stamp && (
                            <span className="text-[10px] text-[#8b949e] mt-1 mx-1">
                                {formatMsgTime(msg.time_stamp)}
                            </span>
                        )}
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
