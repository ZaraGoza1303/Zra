import type { Message } from '../../types/chat';
import { FileText } from 'lucide-react';

interface ReplyPreviewProps {
    replyTo: Message['reply_to'];
    isMe: boolean;
}

export default function ReplyPreview({ replyTo, isMe }: ReplyPreviewProps) {
    if (!replyTo) return null;

    return (
        <div className={`flex items-stretch gap-2 mb-2 rounded-md overflow-hidden text-xs
            ${isMe ? 'bg-blue-950/40' : 'bg-white/[0.07]'}`}>
            <div className="w-[3px] bg-[var(--accent-color)] shrink-0" />
            <div className="px-3 py-2 min-w-0">
                <span className="text-[var(--accent-color)] font-semibold block mb-0.5 pb-1">{replyTo.username}</span>
                {replyTo.type === 'sticker' ? (
                    <img src={replyTo.content} alt="sticker" className="w-10 h-10 object-contain" />
                ) : replyTo.type === 'image' ? (
                    <div className="flex items-center gap-2">
                        <img src={replyTo.content} alt="image" className="w-16 h-12 object-cover rounded-sm" />
                        {replyTo.caption && <span className="truncate opacity-60 italic">{replyTo.caption}</span>}
                    </div>
                ) : replyTo.type === 'file' ? (
                    <div className="flex items-center gap-2 text-[var(--accent-color)]">
                        <FileText size={14} />
                        <span className="truncate italic opacity-80">{replyTo.caption || 'Document'}</span>
                    </div>
                ) : (
                    <p className={`truncate italic ${isMe ? 'text-[var(--text-secondary)]/60' : 'text-[var(--text-muted)]'}`}>
                        {replyTo.content}
                    </p>
                )}
            </div>
        </div>
    );
}
