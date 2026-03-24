interface LightboxProps {
    src: string;
    onClose: () => void;
}

export default function Lightbox({ src, onClose }: LightboxProps) {
    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
            onClick={onClose}>
            <button onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
            <img src={src} alt="preview" onClick={e => e.stopPropagation()}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
        </div>
    );
}
