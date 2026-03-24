import type { Message } from '../../types/chat';

interface ReplyPreviewProps {
    replyTo: Message['reply_to'];
    isMe: boolean;
}

export default function ReplyPreview({ replyTo, isMe }: ReplyPreviewProps) {
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
}
