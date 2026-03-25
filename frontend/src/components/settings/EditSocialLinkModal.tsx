import React, { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { SocialLink, SocialPlatform } from "../../types/chat";

const PLATFORMS: { id: SocialPlatform; name: string; color: string }[] = [
    { id: "youtube", name: "YouTube", color: "#FF0000" },
    { id: "instagram", name: "Instagram", color: "#E4405F" },
    { id: "github", name: "GitHub", color: "#333333" },
    { id: "reddit", name: "Reddit", color: "#FF4500" },
];

interface EditSocialLinkModalProps {
    link: SocialLink;
    onClose: () => void;
    onUpdate: (linkId: number, data: { type?: string; url?: string }) => void;
    onDelete: (linkId: number) => void;
    loading: boolean;
}

function PlatformIcon({ platform, color }: { platform: SocialPlatform; color: string }) {
    switch (platform) {
        case "youtube":
            return (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill={color}>
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            );
        case "instagram":
            return (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill={color}>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
            );
        case "github":
            return (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill={color}>
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
            );
        case "reddit":
            return (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill={color}>
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.249-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
            );
        default:
            return null;
    }
}

export default function EditSocialLinkModal({
    link,
    onClose,
    onUpdate,
    onDelete,
    loading,
}: EditSocialLinkModalProps) {
    const [url, setUrl] = useState(link.url);
    const platform = PLATFORMS.find((p) => p.id === link.type);
    const hasChanges = url.trim() !== link.url;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim() && hasChanges) {
            onUpdate(link.id, { type: link.type, url: url.trim() });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                        Edit {platform?.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-muted)] transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${platform?.color}20` }}
                        >
                            <PlatformIcon platform={link.type} color={platform?.color || "#888"} />
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{platform?.name}</span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl px-4 py-3 text-sm focus:border-[var(--primary-light)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                            placeholder="Enter URL"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => onDelete(link.id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-3 rounded-2xl transition-all"
                        >
                            <Trash2 size={18} />
                            Delete
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !url.trim() || !hasChanges}
                            className="flex-1 bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition-all shadow-lg"
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
