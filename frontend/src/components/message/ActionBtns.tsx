import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Message } from '../../types/chat';

interface ActionBtnsProps {
    msg: Message;
    isMe: boolean;
    selectMode: boolean;
    onReply: (msg: Message) => void;
    onEdit: (msg: Message) => void;
    onDelete: (msgId: string) => void;
    onSelect: (msgId: string, isMe: boolean) => void;
}

export default function ActionBtns({
    msg,
    isMe,
    selectMode,
    onReply,
    onEdit,
    onDelete,
    onSelect,
}: ActionBtnsProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (selectMode) return null;

    return (
        <div className={`absolute -top-3 flex items-center gap-1 transition-opacity z-10 opacity-0 group-hover:opacity-100
            ${isMe ? 'right-2' : 'left-2'}`}>
            <button onClick={() => onReply(msg)}
                className="p-1 rounded-full bg-[#1c2128] border border-white/10 text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                </svg>
            </button>

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
                                    onClick={() => { onEdit(msg); setShowDropdown(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#e6edf3] hover:bg-white/5 transition-colors"
                                >
                                    <Pencil size={12} className="text-blue-400" />
                                    Edit
                                </button>
                            )}
                            <button
                                onClick={() => { onSelect(msg.id!, isMe); setShowDropdown(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#e6edf3] hover:bg-white/5 transition-colors"
                            >
                                <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#8b949e]" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" />
                                </svg>
                                Select
                            </button>
                            <button
                                onClick={() => { onDelete(msg.id!); setShowDropdown(false); }}
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
}
