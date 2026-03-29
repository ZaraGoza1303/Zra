import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ImageOff, FileText } from 'lucide-react';
import { apiCall } from '../../services/api';
import { getRoomImageUrl } from '../../utils/imageUtils';

interface MediaMessage {
    id: string;
    content: string;
    time_stamp: string;
    username: string;
    type: string;
    file_name?: string;
}

interface SharedImagesGalleryProps {
    roomId: string;
    onClose: () => void;
}

export default function SharedImagesGallery({ roomId, onClose }: SharedImagesGalleryProps) {
    const [images, setImages] = useState<MediaMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'image' | 'file'>('all');
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const LIMIT = 20;

    // Trigger slide-in animation
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    const fetchImages = useCallback(async (cursorParam?: string) => {
        try {
            const query = cursorParam ? `?cursor=${encodeURIComponent(cursorParam)}` : '';
            const res = await apiCall<{ data: { message: MediaMessage[]; next_cursor?: string } }>(`/room/${roomId}/media${query}`, { method: 'GET' });
            const data = res.data?.message || [];
            return data;
        } catch (err) {
            console.error('Failed to fetch media:', err);
            return [];
        }
    }, [roomId]);

    // Initial load
    useEffect(() => {
        setLoading(true);
        fetchImages().then((data) => {
            setImages(data);
            if (data.length > 0) {
                setCursor(data[data.length - 1].time_stamp);
            }
            setHasMore(data.length >= LIMIT);
            setLoading(false);
        });
    }, [fetchImages]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(async (entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && cursor) {
                setLoadingMore(true);
                const data = await fetchImages(cursor);
                setImages((prev) => [...prev, ...data]);
                if (data.length > 0) {
                    setCursor(data[data.length - 1].time_stamp);
                }
                setHasMore(data.length >= LIMIT);
                setLoadingMore(false);
            }
        }, { threshold: 0.1 });

        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }

        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, cursor, fetchImages]);

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[299]"
                style={{
                    background: 'transparent',
                    pointerEvents: 'none',
                }}
            />

            {/* Sidebar panel */}
            <div
                className="fixed top-0 right-0 h-full z-[300] flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl"
                style={{
                    width: '340px',
                    transform: visible ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Header */}
                <div className="flex flex-col border-b border-[var(--border-color)] shrink-0">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-[10px] font-bold text-[var(--accent-color)] tracking-widest uppercase mb-0.5">Gallery</p>
                            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Shared Media</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {/* Filter Tabs */}
                    <div className="flex px-5 pb-3 gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filter === 'all'
                                    ? 'bg-[var(--accent-color)] text-white'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('image')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filter === 'image'
                                    ? 'bg-[var(--accent-color)] text-white'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setFilter('file')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filter === 'file'
                                    ? 'bg-[var(--accent-color)] text-white'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            Files
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {(() => {
                        const filteredImages = filter === 'all' 
                            ? images 
                            : images.filter(img => img.type === filter);
                        const imageCount = images.filter(img => img.type === 'image').length;
                        const fileCount = images.filter(img => img.type === 'file').length;

                        if (loading) {
                            return (
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="aspect-square rounded-xl bg-[var(--bg-tertiary)] animate-pulse"
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        if (filteredImages.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
                                    <ImageOff size={40} strokeWidth={1.5} />
                                    <p className="text-sm">
                                        {filter === 'all' 
                                            ? 'No shared media yet' 
                                            : filter === 'image' 
                                                ? 'No shared images yet' 
                                                : 'No shared files yet'}
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    {filteredImages.map((item) => (
                                        item.type === 'image' ? (
                                            <button
                                                key={item.id}
                                                onClick={() => setLightboxSrc(getRoomImageUrl(item.content))}
                                                className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] hover:opacity-90 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/50"
                                            >
                                                <img
                                                    src={getRoomImageUrl(item.content)}
                                                    alt="shared"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </button>
                                        ) : (
                                            <a
                                                href={item.content}
                                                download={item.file_name || 'file'}
                                                key={item.id}
                                                className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] hover:opacity-90 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/50 flex flex-col items-center justify-center p-2"
                                            >
                                                <FileText size={28} className="text-[var(--text-muted)] mb-1" />
                                                <span className="text-[9px] text-[var(--text-muted)] text-center truncate w-full">
                                                    {item.file_name || 'File'}
                                                </span>
                                            </a>
                                        )
                                    ))}
                                </div>

                                {/* Sentinel for infinite scroll */}
                                <div ref={sentinelRef} className="h-4" />

                                {loadingMore && (
                                    <div className="flex justify-center py-4">
                                        <div className="w-5 h-5 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {!hasMore && filteredImages.length > 0 && (
                                    <p className="text-center text-xs text-[var(--text-muted)] py-4">
                                        {filter === 'all' 
                                            ? `All ${imageCount} image${imageCount !== 1 ? 's' : ''}, ${fileCount} file${fileCount !== 1 ? 's' : ''} loaded`
                                            : filter === 'image'
                                                ? `All ${filteredImages.length} image${filteredImages.length !== 1 ? 's' : ''} loaded`
                                                : `All ${filteredImages.length} file${filteredImages.length !== 1 ? 's' : ''} loaded`}
                                    </p>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxSrc(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        onClick={() => setLightboxSrc(null)}
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={lightboxSrc}
                        alt="preview"
                        className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
