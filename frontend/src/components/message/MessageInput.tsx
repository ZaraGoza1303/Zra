import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Send, X, Search, MoreHorizontal, ImagePlus, Smile, Sticker, Image } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { apiCall } from '../../services/api';
import { API_BASE_URL } from '../../config';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface Sticker {
    id: string;
    name: string;
    url: string;
    category: string;
}

interface MessageInputProps {
    sendMessage: (e: React.FormEvent) => void;
    onSendSticker: (stickerUrl: string) => void;
    onSendImage: (imageUrl: string, caption?: string) => void;
}

export interface MessageInputHandle {
    focus: () => void;
}

type PopupTab = 'emoji' | 'sticker';

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
    ({ sendMessage, onSendSticker, onSendImage }, ref) => {
        const { input, setInput, replyTo, setReplyTo } = useChatStore();
        const { token } = useAuthStore();

        // ─── Popup kanan (···) ────────────────────────────────────────────────────
        const [showPopup, setShowPopup] = useState(false);
        const [activeTab, setActiveTab] = useState<PopupTab>('emoji');
        const popupRef = useRef<HTMLDivElement>(null);

        // ─── Sticker ──────────────────────────────────────────────────────────────
        const [stickers, setStickers] = useState<Sticker[]>([]);
        const [categories, setCategories] = useState<string[]>([]);
        const [stickerSearch, setStickerSearch] = useState('');
        const [selectedCategory, setSelectedCategory] = useState('');
        const [loadingStickers, setLoadingStickers] = useState(false);
        const stickerInitialized = useRef(false);
        const searchRef = useRef<HTMLInputElement>(null);

        // ─── Image preview modal ──────────────────────────────────────────────────
        const [previewFile, setPreviewFile] = useState<File | null>(null);
        const [previewUrl, setPreviewUrl] = useState<string | null>(null);
        const [caption, setCaption] = useState('');
        const [uploadingImage, setUploadingImage] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);
        const captionRef = useRef<HTMLInputElement>(null);

        const inputRef = useRef<HTMLInputElement>(null);

        useImperativeHandle(ref, () => ({
            focus: () => inputRef.current?.focus(),
        }));

        // cleanup object URL saat unmount
        useEffect(() => {
            return () => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
            };
        }, [previewUrl]);

        // ─── Sticker logic ────────────────────────────────────────────────────────

        const fetchStickers = async (search = '', category = '') => {
            setLoadingStickers(true);
            try {
                const params = new URLSearchParams();
                if (search) params.append('search', search);
                if (category) params.append('category', category);
                const url = params.toString() ? `/room/stickers?${params.toString()}` : '/room/stickers';
                const resp = await apiCall<{ data: Sticker[] }>(url, { method: 'GET' });
                setStickers(resp.data || []);
            } catch (e) {
                console.error('Failed to fetch stickers', e);
            } finally {
                setLoadingStickers(false);
            }
        };

        const initStickers = async () => {
            if (stickerInitialized.current) return;
            setLoadingStickers(true);
            try {
                const resp = await apiCall<{ data: Sticker[] }>('/room/stickers', { method: 'GET' });
                const allStickers = resp.data || [];
                setStickers(allStickers);
                const cats = Array.from(new Set(allStickers.map((s) => s.category)));
                setCategories(cats);
                stickerInitialized.current = true;
            } catch (e) {
                console.error('Failed to fetch stickers', e);
            } finally {
                setLoadingStickers(false);
            }
        };

        useEffect(() => {
            if (!stickerInitialized.current) return;
            const timeout = setTimeout(() => {
                fetchStickers(stickerSearch, selectedCategory);
            }, 400);
            return () => clearTimeout(timeout);
        }, [stickerSearch, selectedCategory]);

        const handleStickerClick = (url: string) => {
            onSendSticker(url);
        };

        // ─── Popup logic ──────────────────────────────────────────────────────────

        const handleTogglePopup = async () => {
            const next = !showPopup;
            setShowPopup(next);
            if (next && activeTab === 'sticker') {
                await initStickers();
                setTimeout(() => searchRef.current?.focus(), 50);
            }
        };

        const handleTabChange = async (tab: PopupTab) => {
            setActiveTab(tab);
            if (tab === 'sticker') {
                await initStickers();
                setTimeout(() => searchRef.current?.focus(), 50);
            }
        };

        const handleClosePopup = () => {
            setShowPopup(false);
            setStickerSearch('');
            setSelectedCategory('');
            setCategories([]);
            stickerInitialized.current = false;
        };

        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                    handleClosePopup();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleEmojiSelect = (emoji: any) => {
            setInput(input + emoji.native);
            inputRef.current?.focus();
        };

        // ─── Image preview logic ──────────────────────────────────────────────────

        // Pas pilih file → tampilkan preview, BELUM upload
        const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const url = URL.createObjectURL(file);
            setPreviewFile(file);
            setPreviewUrl(url);
            setCaption('');

            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => captionRef.current?.focus(), 100);
        };

        const handleCancelPreview = () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewFile(null);
            setPreviewUrl(null);
            setCaption('');
        };

        // Pas user pencet send di modal → baru upload ke BE
        const handleSendImage = async () => {
            if (!previewFile || uploadingImage) return;

            setUploadingImage(true);
            try {
                const formData = new FormData();
                formData.append('file', previewFile);

                const res = await fetch(`${API_BASE_URL}/room/upload-image`, {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                });

                const json = await res.json();

                if (!res.ok) throw new Error(json.message || 'Upload failed');

                onSendImage(json.data, caption.trim() || undefined);
                handleCancelPreview();
            } catch (err: any) {
                console.error('Upload failed:', err);
                alert(err.message || 'Gagal upload gambar. Coba lagi.');
            } finally {
                setUploadingImage(false);
            }
        };

        const handleCaptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendImage();
            }
            if (e.key === 'Escape') {
                handleCancelPreview();
            }
        };

        // ─── Render ───────────────────────────────────────────────────────────────

        return (
            <>
                {/* ── Image Preview Modal ── */}
                {previewUrl && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end justify-center sm:items-center p-4"
                        onClick={handleCancelPreview}
                    >
                        <div
                            className="w-full max-w-md bg-[#1c2128] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                <div className="flex items-center gap-2 text-sm font-medium text-[#e6edf3]">
                                    <Image size={15} className="text-blue-400" />
                                    Send Image
                                </div>
                                <button
                                    onClick={handleCancelPreview}
                                    disabled={uploadingImage}
                                    className="text-[#8b949e] hover:text-[#e6edf3] transition-colors disabled:opacity-40"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Preview area */}
                            <div className="relative bg-[#0b0e11] flex items-center justify-center" style={{ minHeight: 200, maxHeight: 380 }}>
                                <img
                                    src={previewUrl}
                                    alt="preview"
                                    className="max-w-full max-h-[360px] object-contain"
                                />
                                {uploadingImage && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs text-white/70">Uploading...</span>
                                    </div>
                                )}
                            </div>

                            {/* Reply preview di dalam modal kalau ada */}
                            {replyTo && (
                                <div className="flex items-stretch gap-0 mx-4 mt-3 rounded-md overflow-hidden text-xs bg-white/[0.07]">
                                    <div className="w-[3px] bg-blue-400 shrink-0" />
                                    <div className="px-3 py-2 min-w-0">
                                        <span className="text-blue-400 font-semibold block mb-0.5">{replyTo.username}</span>
                                        {replyTo.type === 'image' ? (
                                            <img src={replyTo.content} alt="image" className="w-16 h-12 object-cover rounded-md" />
                                        ) : replyTo.type === 'sticker' ? (
                                            <img src={replyTo.content} alt="sticker" className="w-10 h-10 object-contain" />
                                        ) : (
                                            <p className="truncate italic text-[#8b949e]">{replyTo.content}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Caption + send */}
                            <div className="flex items-center gap-2 px-3 py-3">
                                <input
                                    ref={captionRef}
                                    type="text"
                                    placeholder="Add a caption... (optional)"
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    onKeyDown={handleCaptionKeyDown}
                                    disabled={uploadingImage}
                                    className="flex-1 px-4 py-2.5 bg-[#0b0e11] border border-white/10 rounded-xl text-sm
                                        text-[#e6edf3] placeholder-[#8b949e] outline-none
                                        focus:border-blue-500/50 transition-colors disabled:opacity-40"
                                />
                                <button
                                    onClick={handleSendImage}
                                    disabled={uploadingImage}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600
                                        hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed
                                        hover:scale-105 transition-all shadow-lg shadow-blue-600/30 shrink-0"
                                >
                                    <Send size={16} className="translate-x-[1px]" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-5 py-4 bg-[#0b0e11] shrink-0">

                    {/* Reply preview */}
                    {replyTo && (
                        <div className="flex items-center justify-between px-4 py-2 mb-2 bg-white/5 border border-white/10 rounded-xl text-xs text-[#8b949e]">
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-8 bg-blue-400 rounded-full shrink-0" />
                                <div>
                                    <span className="text-blue-400 font-medium block">{replyTo.username}</span>
                                    {replyTo.type === 'sticker' ? (
                                        <img src={replyTo.content} alt="sticker" className="w-10 h-15 object-contain" />
                                    ) : replyTo.type === 'image' ? (
                                        <img src={replyTo.content} alt="image" className="w-16 h-12 object-cover rounded-lg" />
                                    ) : (
                                        <p className="truncate max-w-[300px] opacity-70">{replyTo.content}</p>
                                    )}
                                </div>
                            </div>
                            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-[#e6edf3] ml-2">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <form onSubmit={sendMessage} className="flex items-center gap-3">

                        {/* ── Tombol + (Image Upload) ── */}
                        <div className="shrink-0">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1c2128] border border-white/10
                                    text-[#8b949e] hover:text-[#e6edf3] hover:border-white/20 transition-all"
                            >
                                <ImagePlus size={18} />
                            </button>
                        </div>

                        {/* ── Input area ── */}
                        <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#1c2128] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 bg-transparent border-none text-[15px] text-[#e6edf3] placeholder-[#8b949e] outline-none"
                            />

                            {/* ── Tombol ··· ── */}
                            <div className="relative" ref={popupRef}>
                                <button
                                    type="button"
                                    onClick={handleTogglePopup}
                                    className={`transition-colors shrink-0 ${showPopup ? 'text-blue-400' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {showPopup && (
                                    <div className="absolute bottom-10 right-0 z-50 w-[352px] bg-[#1c2128] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                        <div className="flex items-center border-b border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => handleTabChange('emoji')}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all
                                                    ${activeTab === 'emoji' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
                                            >
                                                <Smile size={14} /> Emoji
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTabChange('sticker')}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all
                                                    ${activeTab === 'sticker' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
                                            >
                                                <Sticker size={14} /> Sticker
                                            </button>
                                            <button type="button" onClick={handleClosePopup} className="px-3 text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {activeTab === 'emoji' && (
                                            <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" />
                                        )}

                                        {activeTab === 'sticker' && (
                                            <div>
                                                <div className="px-3 pt-3 pb-1">
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-[#0b0e11] border border-white/10 rounded-xl focus-within:border-blue-500/50 transition-colors">
                                                        <Search size={14} className="text-[#8b949e] shrink-0" />
                                                        <input
                                                            ref={searchRef}
                                                            type="text"
                                                            placeholder="Search stickers..."
                                                            value={stickerSearch}
                                                            onChange={(e) => setStickerSearch(e.target.value)}
                                                            className="flex-1 bg-transparent text-xs text-[#e6edf3] placeholder-[#8b949e] outline-none"
                                                        />
                                                        {stickerSearch && (
                                                            <button type="button" onClick={() => setStickerSearch('')} className="text-[#8b949e] hover:text-[#e6edf3]">
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {categories.length > 0 && (
                                                    <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-hide">
                                                        {['', ...categories].map((cat) => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => setSelectedCategory(cat)}
                                                                className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all
                                                                    ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white/5 text-[#8b949e] hover:bg-white/10 hover:text-[#e6edf3]'}`}
                                                            >
                                                                {cat === '' ? 'All' : cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="p-3 h-52 overflow-y-auto">
                                                    {loadingStickers ? (
                                                        <div className="flex items-center justify-center h-full gap-2">
                                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-xs text-[#8b949e]">Loading...</span>
                                                        </div>
                                                    ) : stickers.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center h-full gap-1">
                                                            <span className="text-2xl">🔍</span>
                                                            <span className="text-xs text-[#8b949e]">
                                                                {stickerSearch ? `No results for "${stickerSearch}"` : 'No stickers available'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {stickers.map((sticker) => (
                                                                <div key={sticker.id} className="relative group/sticker">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStickerClick(sticker.url)}
                                                                        className="aspect-square w-full rounded-xl overflow-hidden hover:bg-white/10 p-1 transition-all hover:scale-110"
                                                                    >
                                                                        <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
                                                                    </button>
                                                                    <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover/sticker:opacity-100 transition-opacity duration-150">
                                                                        <div className="w-2 h-2 bg-[#0b0e11] border-l border-t border-white/10 rotate-45 mx-auto -mb-1" />
                                                                        <div className="px-2 py-1 bg-[#0b0e11] border border-white/10 rounded-lg text-[10px] text-[#e6edf3] whitespace-nowrap shadow-lg">
                                                                            {sticker.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Send button ── */}
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white
                                hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105
                                transition-all shadow-lg shadow-blue-600/30 shrink-0"
                        >
                            <Send size={18} className="translate-x-[1px]" />
                        </button>
                    </form>
                </div>
            </>
        );
    }
);

MessageInput.displayName = 'MessageInput';
export default MessageInput;