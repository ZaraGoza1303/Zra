import React from 'react';
import { Plus, Smile, Send } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface MessageInputProps {
    sendMessage: (e: React.FormEvent) => void;
}

export default function MessageInput({ sendMessage }: MessageInputProps) {
    const { input, setInput } = useChatStore();

    return (
        <div className="px-5 py-4 bg-[#0d1117] shrink-0">
            <form onSubmit={sendMessage} className="flex items-center gap-3">
                <button
                    type="button"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1c2128] border border-white/10 text-[#8b949e] hover:text-[#e6edf3] hover:border-white/20 transition-all shrink-0"
                >
                    <Plus size={18} />
                </button>

                <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#1c2128] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="flex-1 bg-transparent border-none text-[15px] text-[#e6edf3] placeholder-[#8b949e] outline-none"
                    />
                    <button
                        type="button"
                        className="text-[#8b949e] hover:text-[#e6edf3] transition-colors shrink-0"
                    >
                        <Smile size={20} />
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-lg shadow-blue-600/30 shrink-0"
                >
                    <Send size={18} className="translate-x-[1px]" />
                </button>
            </form>
        </div>
    );
}
