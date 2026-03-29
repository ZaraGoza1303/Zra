import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Send, X, Search, Smile, Image, Plus, FileText } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { apiCall } from '../../services/api';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface Sticker {
    id: string;
    name: string;
    url: string;
    category: string;
}

interface MessageInputProps {
    roomId: string;
    socket: WebSocket | null;
    sendMessage: (e: React.FormEvent) => void;
    onSendSticker: (stickerUrl: string) => void;
    onSendImage: (imageUrl: string, caption?: string) => void;
    onSendFile: (fileUrl: string, fileName: string, caption?: string) => void;
}

export interface MessageInputHandle {
    focus: () => void;
}

type PopupTab = 'emoji' | 'sticker';

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
    ({ roomId, socket, sendMessage, onSendSticker, onSendImage, onSendFile }, ref) => {
        const { input, setInput, replyTo, setReplyTo } = useChatStore();

        // ─── Popups ────────────────────────────────────────────────────
        const [showPopup, setShowPopup] = useState(false);
        const [showAttachMenu, setShowAttachMenu] = useState(false);
        const [activeTab, setActiveTab] = useState<PopupTab>('emoji');
        const popupRef = useRef<HTMLDivElement>(null);
        const attachMenuRef = useRef<HTMLDivElement>(null);

        // ─── Sticker ──────────────────────────────────────────────────────────────
        const [stickers, setStickers] = useState<Sticker[]>([]);
        const [categories, setCategories] = useState<string[]>([]);
        const [stickerSearch, setStickerSearch] = useState('');
        const [selectedCategory, setSelectedCategory] = useState('');
        const [loadingStickers, setLoadingStickers] = useState(false);
        const stickerInitialized = useRef(false);
        const searchRef = useRef<HTMLInputElement>(null);

        // ─── Multi File preview modal ──────────────────────────────────────────────────
        const [pendingFiles, setPendingFiles] = useState<{ file: File; url: string; type: 'image' | 'file'; caption?: string }[]>([]);
        const [selectedIdx, setSelectedIdx] = useState(0);
        const [uploadingFiles, setUploadingFiles] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);
        const fileUploadTypeRef = useRef<'image' | 'file'>('image');
        const inputRef = useRef<HTMLInputElement>(null);

        useImperativeHandle(ref, () => ({
            focus: () => inputRef.current?.focus(),
        }));

        // cleanup object URLs saat unmount
        useEffect(() => {
            return () => {
                pendingFiles.forEach(f => {
                    if (f.url) URL.revokeObjectURL(f.url);
                });
            };
        }, [pendingFiles]);

        // ─── Typing Indicator Logic ───────────────────────────────────────────────
        const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const isTypingRef = useRef(false);

        const sendTypingStatus = (isTyping: boolean) => {
            if (!socket || socket.readyState !== WebSocket.OPEN) return;

            socket.send(JSON.stringify({
                type: 'typing',
                room_id: roomId,
                content: isTyping ? 'true' : 'false'
            }));
            isTypingRef.current = isTyping;
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInput(value);

            if (!isTypingRef.current && value.trim().length > 0) {
                sendTypingStatus(true);
            }

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                if (isTypingRef.current) {
                    sendTypingStatus(false);
                }
            }, 2000);
        };

        const handleFormSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            sendTypingStatus(false);
            sendMessage(e);
        };

        // ─── Multi File selection logic ──────────────────────────────────────────────────

        const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            fileUploadTypeRef.current = type;
            const newPending = files.map(file => ({
                file,
                url: type === 'image' ? URL.createObjectURL(file) : '',
                type
            }));

            setPendingFiles(prev => [...prev, ...newPending]);
            setShowAttachMenu(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        const handleCancelPending = () => {
            pendingFiles.forEach(pf => {
                if (pf.url) URL.revokeObjectURL(pf.url);
            });
            setPendingFiles([]);
            setSelectedIdx(0);
        };

        const handleRemoveFile = (index: number) => {
            setPendingFiles(prev => {
                const updated = [...prev];
                if (updated[index].url) URL.revokeObjectURL(updated[index].url);
                updated.splice(index, 1);
                if (selectedIdx >= updated.length) {
                    setSelectedIdx(Math.max(0, updated.length - 1));
                }
                return updated;
            });
        };

        const handleSendFiles = async () => {
            if (pendingFiles.length === 0 || uploadingFiles) return;

            setUploadingFiles(true);
            try {
                const imageFiles = pendingFiles.filter(f => f.type === 'image');
                const docFiles = pendingFiles.filter(f => f.type === 'file');

                if (imageFiles.length > 0) {
                    const formData = new FormData();
                    imageFiles.forEach(f => formData.append('files', f.file));

                    const resp = await apiCall<{ data: string[] }>('/room/upload-images', {
                        method: 'POST',
                        body: formData
                    });

                    if (resp?.data) {
                        resp.data.forEach((url, i) => {
                            onSendImage(url, imageFiles[i].caption?.trim());
                        });
                    }
                }

                if (docFiles.length > 0) {
                    const formData = new FormData();
                    docFiles.forEach(f => formData.append('files', f.file));

                    const resp = await apiCall<{ data: string[] }>('/room/upload-files', {
                        method: 'POST',
                        body: formData
                    });

                    if (resp?.data) {
                        resp.data.forEach((url, i) => {
                            onSendFile(url, docFiles[i].file.name, docFiles[i].caption?.trim());
                        });
                    }
                }

                handleCancelPending();
            } catch (err: any) {
                console.error('Upload failed:', err);
                alert(err.message || 'Gagal upload file. Coba lagi.');
            } finally {
                setUploadingFiles(false);
            }
        };

        const handleCaptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendFiles();
            }
            if (e.key === 'Escape') {
                handleCancelPending();
            }
        };

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
                if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
                    setShowAttachMenu(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleEmojiSelect = (emoji: any) => {
            setInput(input + emoji.native);
            inputRef.current?.focus();
        };

        // ─── Render ───────────────────────────────────────────────────────────────

        return (
            <div className="px-4 py-3 bg-[var(--bg-primary)] border-t border-[var(--border-color)] relative">
                {/* Reply Preview */}
                {replyTo && (
                    <div className="mb-3 p-3 bg-[var(--bg-secondary)] border-l-4 border-blue-500 rounded-lg flex items-start justify-between animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-blue-400 mb-1">
                                Replying to {replyTo.username}
                            </div>
                            <div className="text-sm text-[var(--text-muted)] line-clamp-1 italic">
                                {replyTo.type === 'sticker' ? '🎭 Sticker' : replyTo.type === 'image' ? '📷 Image' : replyTo.content}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReplyTo(null)}
                            className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-muted)]"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 max-w-7xl mx-auto">
                    {/* Attachment Menu Button */}
                    <div className="relative" ref={attachMenuRef}>
                        <button
                            type="button"
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${showAttachMenu ? 'bg-blue-500 text-white rotate-45' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                        >
                            <Plus size={22} />
                        </button>

                        {/* Attach Kebab Menu */}
                        {showAttachMenu && (
                            <div className="absolute bottom-full left-0 mb-3 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        fileUploadTypeRef.current = 'image';
                                        fileInputRef.current?.setAttribute('accept', 'image/*');
                                        fileInputRef.current?.setAttribute('multiple', '');
                                        fileInputRef.current?.click();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-primary)]"
                                >
                                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                        <Image size={18} />
                                    </div>
                                    Upload Images
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        fileUploadTypeRef.current = 'file';
                                        fileInputRef.current?.setAttribute('accept', '.pdf,.docx,.7z,.zip');
                                        fileInputRef.current?.setAttribute('multiple', '');
                                        fileInputRef.current?.click();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-primary)] border-t border-[var(--border-color)]"
                                >
                                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                        <FileText size={18} />
                                    </div>
                                    Upload Files
                                </button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleFormSubmit} className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-2xl border border-transparent focus-within:border-blue-500/30 focus-within:bg-[var(--bg-secondary)] transition-all flex items-center px-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Type a message..."
                                className="flex-1 py-3 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] text-[15px]"
                            />
                            <div className="relative" ref={popupRef}>
                                <button
                                    type="button"
                                    onClick={handleTogglePopup}
                                    className={`p-1.5 transition-colors rounded-lg ${showPopup ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <Smile size={20} />
                                </button>

                                {showPopup && (
                                    <div
                                        className="absolute bottom-full right-0 mb-3 w-[350px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50 flex flex-col"
                                        style={{ height: '450px' }}
                                    >
                                        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
                                            <button
                                                type="button"
                                                onClick={() => handleTabChange('emoji')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'emoji' ? 'bg-[var(--bg-primary)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                            >
                                                Emojis
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTabChange('sticker')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'sticker' ? 'bg-[var(--bg-primary)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                            >
                                                Stickers
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-hidden relative">
                                            {activeTab === 'emoji' ? (
                                                <div className="h-full overflow-y-auto custom-scrollbar emoji-picker-container">
                                                    <Picker
                                                        data={data}
                                                        onEmojiSelect={handleEmojiSelect}
                                                        theme="dark"
                                                        set="native"
                                                        skinTonePosition="none"
                                                        previewPosition="none"
                                                        navPosition="none"
                                                        perLine={8}
                                                        maxFrequentRows={1}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col p-3 gap-3">
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                        <input
                                                            ref={searchRef}
                                                            type="text"
                                                            value={stickerSearch}
                                                            onChange={(e) => setStickerSearch(e.target.value)}
                                                            placeholder="Search stickers..."
                                                            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm outline-none focus:border-blue-500/40 transition-all font-light"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCategory('')}
                                                            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${selectedCategory === '' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                                                        >
                                                            All
                                                        </button>
                                                        {categories.map((cat) => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => setSelectedCategory(cat)}
                                                                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-4 gap-2 pt-1">
                                                        {loadingStickers ? (
                                                            Array(12).fill(0).map((_, i) => (
                                                                <div key={i} className="aspect-square bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
                                                            ))
                                                        ) : (
                                                            stickers.map((st) => (
                                                                <button
                                                                    key={st.id}
                                                                    type="button"
                                                                    onClick={() => handleStickerClick(st.url)}
                                                                    className="aspect-square p-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-xl transition-all hover:scale-105 active:scale-95 group"
                                                                >
                                                                    <img src={st.url} alt={st.name} className="w-full h-full object-contain" />
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${input.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'}`}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, fileUploadTypeRef.current)}
                />

                {/* MODAL PREVIEW MULTI FILE */}
                {pendingFiles.length > 0 && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleCancelPending} />
                        <div className="relative w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    Send {pendingFiles.length} {pendingFiles[0].type === 'image' ? 'Images' : 'Files'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleCancelPending}
                                    className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-all text-[var(--text-muted)] hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {pendingFiles.map((pf, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedIdx(idx)}
                                            className={`relative aspect-square bg-[var(--bg-secondary)] border-2 rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all ${selectedIdx === idx ? 'border-blue-500 scale-105 shadow-blue-500/20' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                                        >
                                            {pf.type === 'image' ? (
                                                <img src={pf.url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-2 text-center bg-[var(--bg-tertiary)]">
                                                    <FileText size={24} className="text-[var(--accent-color)]" />
                                                    <span className="text-[10px] text-[var(--text-muted)] line-clamp-2 truncate px-1">
                                                        {pf.caption || pf.file.name}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(idx);
                                                }}
                                                className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full transition-opacity hover:bg-red-500 z-10"
                                            >
                                                <X size={12} />
                                            </button>
                                            {pf.caption && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1 text-[9px] text-white text-center truncate">
                                                    {pf.caption}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-blue-500/50 hover:text-blue-500 hover:bg-blue-500/5 transition-all group"
                                    >
                                        <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-medium">Add more</span>
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                                            Editing Item #{selectedIdx + 1}
                                        </label>
                                        <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">
                                            {pendingFiles[selectedIdx]?.file.name}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={pendingFiles[selectedIdx]?.caption || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPendingFiles(prev => prev.map((item, i) => i === selectedIdx ? { ...item, caption: val } : item));
                                        }}
                                        onKeyDown={handleCaptionKeyDown}
                                        placeholder={pendingFiles[selectedIdx]?.type === 'image' ? 'Add a caption for this image...' : 'Rename file (optional)...'}
                                        className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl outline-none focus:border-blue-500/50 transition-all text-sm shadow-inner"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="p-5 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-color)] flex items-center justify-between gap-4">
                                <div className="text-xs text-[var(--text-muted)] font-light italic hidden sm:block">
                                    Files are encrypted end-to-end
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={handleCancelPending}
                                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl hover:bg-[var(--bg-hover)] text-sm font-medium text-[var(--text-muted)] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendFiles}
                                        disabled={uploadingFiles}
                                        className={`flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${uploadingFiles ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                                    >
                                        {uploadingFiles ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Send
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

MessageInput.displayName = 'MessageInput';
export default MessageInput;