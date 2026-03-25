import { useState } from "react";
import { X, Plus, ArrowLeft, Check } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import type { SocialLink, SocialPlatform } from "../../types/chat";

const PLATFORMS: { id: SocialPlatform; name: string; color: string; darkColor: string; buttonColor: string; placeholder: string }[] = [
    { id: "youtube", name: "YouTube", color: "#FF0000", darkColor: "#FF0000", buttonColor: "#FF0000", placeholder: "https://youtube.com/@channelname" },
    { id: "instagram", name: "Instagram", color: "#E4405F", darkColor: "#E4405F", buttonColor: "#E4405F", placeholder: "https://instagram.com/username" },
    { id: "github", name: "GitHub", color: "#1e293b", darkColor: "#F0F6FC", buttonColor: "#24292f", placeholder: "https://github.com/username" },
    { id: "reddit", name: "Reddit", color: "#FF4500", darkColor: "#FF4500", buttonColor: "#FF4500", placeholder: "https://reddit.com/u/username" },
];

function parseUsername(platform: SocialPlatform, url: string): string {
    try {
        const u = new URL(url);
        const parts = u.pathname.split("/").filter(Boolean);
        switch (platform) {
            case "youtube":
                if (parts[0]?.startsWith("@")) return parts[0];
                if (parts.length >= 2 && ["channel", "c", "user"].includes(parts[0])) return parts[1];
                return parts[0] ?? url;
            case "instagram":
                return `@${parts[0] ?? ""}`;
            case "github":
                return parts[0] ?? url;
            case "reddit":
                if (parts[0] === "u" || parts[0] === "user") return `u/${parts[1] ?? ""}`;
                return parts[0] ?? url;
            default:
                return url;
        }
    } catch {
        return url;
    }
}

function PlatformIcon({ platform, color, sizeClass = "w-6 h-6" }: { platform: SocialPlatform; color: string; sizeClass?: string }) {
    switch (platform) {
        case "youtube":
            return (
                <svg viewBox="0 0 24 24" className={sizeClass} fill={color}>
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            );
        case "instagram":
            return (
                <svg viewBox="0 0 24 24" className={sizeClass} fill={color}>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
            );
        case "github":
            return (
                <svg viewBox="0 0 24 24" className={sizeClass} fill={color}>
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
            );
        case "reddit":
            return (
                <svg viewBox="0 0 24 24" className={sizeClass} fill={color}>
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.249-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
            );
        default:
            return null;
    }
}

type SlotState = { status: "empty" } | { status: "selecting" } | { status: "inputting"; platform: SocialPlatform } | { status: "filled"; platform: SocialPlatform; url: string };

function EmptySlot({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-[var(--text-muted)] opacity-60 hover:opacity-100 bg-[var(--bg-primary)] flex items-center justify-center cursor-pointer transition-all duration-200 text-[var(--text-muted)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:scale-105"
        >
            <Plus size={28} />
        </button>
    );
}

function FilledSlot({ platform, url, onRemove, isDark }: { platform: SocialPlatform; url: string; onRemove: () => void; isDark: boolean }) {
    const meta = PLATFORMS.find((p) => p.id === platform);
    const username = parseUsername(platform, url);
    const [hovered, setHovered] = useState(false);

    if (!meta) return null;
    const effectiveColor = isDark ? meta.darkColor : meta.color;

    return (
        <div className="flex flex-col items-center gap-1.5" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center relative transition-all duration-200"
                style={{ backgroundColor: `${effectiveColor}18`, border: `2px solid ${effectiveColor}55` }}
            >
                <PlatformIcon platform={platform} color={effectiveColor} sizeClass="w-7 h-7" />
                {hovered && (
                    <button
                        onClick={onRemove}
                        className="absolute -top-1 -right-1 w-[22px] h-[22px] rounded-full bg-red-500 border-none cursor-pointer flex items-center justify-center text-white"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] max-w-[80px] truncate text-center" title={username}>
                {username}
            </span>
        </div>
    );
}

interface AddSocialLinkModalProps {
    existingLinks: SocialLink[];
    onClose: () => void;
    onSave: (links: { type: SocialPlatform; url: string }[]) => void;
    loading: boolean;
}

export default function AddSocialLinkModal({ existingLinks, onClose, onSave, loading }: AddSocialLinkModalProps) {
    const { mode } = useThemeStore();
    const isDark = mode === 'dark';

    const initialSlots: SlotState[] = Array.from({ length: 4 }, (_, i) => {
        const existing = existingLinks[i];
        if (existing) return { status: "filled", platform: existing.type, url: existing.url };
        return { status: "empty" };
    });

    const [slots, setSlots] = useState<SlotState[]>(initialSlots);
    const [activeSlot, setActiveSlot] = useState<number | null>(null);
    const [urlInput, setUrlInput] = useState("");
    const [urlError, setUrlError] = useState("");

    const activeSlotData = activeSlot !== null ? slots[activeSlot] : null;
    const filledCount = slots.filter((s) => s.status === "filled").length;
    const isInFlow = activeSlotData?.status === "selecting" || activeSlotData?.status === "inputting";
    const inputtingPlatform = activeSlotData?.status === "inputting" ? PLATFORMS.find((p) => p.id === activeSlotData.platform) : null;

    const handleSlotClick = (index: number) => {
        if (isInFlow) return;
        const slot = slots[index];
        if (slot.status === "empty") {
            setSlots((prev) => prev.map((s, i) => (i === index ? { status: "selecting" } : s)));
            setActiveSlot(index);
            setUrlInput("");
            setUrlError("");
        }
    };

    const handleSelectPlatform = (platform: SocialPlatform) => {
        if (activeSlot === null) return;
        setSlots((prev) => prev.map((s, i) => (i === activeSlot ? { status: "inputting", platform } : s)));
        setUrlInput("");
        setUrlError("");
    };

    const handleConfirm = () => {
        if (activeSlot === null) return;
        const slot = slots[activeSlot];
        if (slot.status !== "inputting") return;

        const trimmed = urlInput.trim();
        if (!trimmed) {
            setUrlError("URL tidak boleh kosong.");
            return;
        }
        try {
            new URL(trimmed);
        } catch {
            setUrlError("URL tidak valid. Pastikan format benar.");
            return;
        }

        const platformConfig = PLATFORMS.find(p => p.id === slot.platform);
        if (platformConfig) {
            const domain = platformConfig.id === 'youtube' ? 'youtube.com' : platformConfig.id === 'instagram' ? 'instagram.com' : platformConfig.id === 'github' ? 'github.com' : 'reddit.com';
            if (!trimmed.toLowerCase().includes(domain)) {
                setUrlError(`URL harus menggunakan ${platformConfig.name}.`);
                return;
            }
        }

        setSlots((prev) => prev.map((s, i) => (i === activeSlot ? { status: "filled", platform: slot.platform, url: trimmed } : s)));
        setActiveSlot(null);
        setUrlInput("");
        setUrlError("");
    };

    const handleBack = () => {
        if (activeSlot === null) return;
        const slot = slots[activeSlot];
        if (slot.status === "inputting") {
            setSlots((prev) => prev.map((s, i) => (i === activeSlot ? { status: "selecting" } : s)));
        } else if (slot.status === "selecting") {
            setSlots((prev) => prev.map((s, i) => (i === activeSlot ? { status: "empty" } : s)));
            setActiveSlot(null);
        }
        setUrlError("");
    };

    const handleRemoveSlot = (index: number) => {
        setSlots((prev) => prev.map((s, i) => (i === index ? { status: "empty" } : s)));
        if (activeSlot === index) setActiveSlot(null);
    };

    const handleSave = () => {
        const filled = slots.filter((s): s is Extract<SlotState, { status: "filled" }> => s.status === "filled").map((s) => ({ type: s.platform, url: s.url }));
        onSave(filled);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isInFlow ? undefined : onClose} />
            <div className="relative w-full max-w-[420px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[28px] p-8 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-7">
                    {isInFlow ? (
                        <button onClick={handleBack} className="flex items-center gap-1.5 bg-none border-none cursor-pointer text-[var(--text-secondary)] text-sm py-1">
                            <ArrowLeft size={18} />
                            Back
                        </button>
                    ) : (
                        <h2 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Social Links</h2>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full bg-none border-none cursor-pointer text-[var(--text-muted)] flex">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex justify-center gap-4 mb-7">
                    {slots.map((slot, i) => {
                        if (slot.status === "filled") {
                            return <FilledSlot key={i} platform={slot.platform} url={slot.url} onRemove={() => handleRemoveSlot(i)} isDark={isDark} />;
                        }
                        if (slot.status === "selecting" || slot.status === "inputting") {
                            const platformId = slot.status === "inputting" ? slot.platform : null;
                            const platformMeta = platformId ? PLATFORMS.find(p => p.id === platformId) : null;
                            return (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <div className="w-[72px] h-[72px] rounded-full border-2 border-[var(--accent-color)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-color)]">
                                        {slot.status === "inputting" && platformMeta ? (
                                            <PlatformIcon platform={platformId!} color={isDark ? platformMeta.darkColor : platformMeta.color} sizeClass="w-7 h-7" />
                                        ) : (
                                            <Plus size={28} />
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                                <EmptySlot onClick={() => handleSlotClick(i)} />
                            </div>
                        );
                    })}
                </div>

                {activeSlotData?.status === "selecting" && (
                    <div>
                        <p className="text-[13px] text-[var(--text-muted)] text-center mb-4">Pilih platform</p>
                        <div className="grid grid-cols-2 gap-3">
                            {PLATFORMS.map((platform) => {
                                const alreadyUsed = slots.some(s => s.status === "filled" && s.platform === platform.id);
                                return (
                                    <button
                                        key={platform.id}
                                        onClick={() => !alreadyUsed && handleSelectPlatform(platform.id)}
                                        disabled={alreadyUsed}
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-sm font-semibold transition-all duration-150 ${alreadyUsed
                                            ? "border-[var(--border-color)] bg-[var(--bg-primary)] cursor-not-allowed opacity-40"
                                            : "cursor-pointer"
                                            }`}
                                        style={{
                                            borderColor: alreadyUsed ? undefined : `${isDark ? platform.darkColor : platform.color}44`,
                                            background: alreadyUsed ? undefined : `${isDark ? platform.darkColor : platform.color}10`
                                        }}
                                    >
                                        <PlatformIcon platform={platform.id} color={isDark ? platform.darkColor : platform.color} sizeClass="w-5 h-5" />
                                        <span className="text-[var(--text-primary)]">{platform.name}</span>
                                        {alreadyUsed && <Check size={14} className="ml-auto text-[var(--text-muted)]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeSlotData?.status === "inputting" && inputtingPlatform && (
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                                <PlatformIcon platform={inputtingPlatform.id} color={isDark ? inputtingPlatform.darkColor : inputtingPlatform.color} sizeClass="w-[18px] h-[18px]" />
                                {inputtingPlatform.name} URL
                            </label>
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-muted)] cursor-pointer transition-all duration-150 hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]"
                            >
                                <ArrowLeft size={12} />
                                Ganti platform
                            </button>
                        </div>
                        <input
                            autoFocus
                            type="url"
                            value={urlInput}
                            onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                            placeholder={inputtingPlatform.placeholder}
                            className="w-full bg-[var(--bg-primary)] rounded-2xl p-3 text-sm text-[var(--text-primary)] outline-none box-border transition-colors"
                            style={{ border: `1px solid ${urlError ? "#ef4444" : "transparent"}` }}
                            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = inputtingPlatform.color; }}
                            onBlur={(e) => { if (!urlError) (e.target as HTMLInputElement).style.borderColor = "transparent"; }}
                        />
                        {urlError && <p className="text-xs text-red-500 mt-1.5">{urlError}</p>}
                        <button
                            onClick={handleConfirm}
                            className="w-full mt-4 py-3.5 rounded-2xl border-none text-white text-[15px] font-bold cursor-pointer transition-opacity"
                            style={{ background: inputtingPlatform.buttonColor }}
                        >
                            Confirm
                        </button>
                    </div>
                )}

                {!isInFlow && (
                    <button
                        onClick={handleSave}
                        disabled={loading || filledCount === 0}
                        className="w-full mt-2 py-3.5 rounded-2xl border-none bg-[var(--accent-color)] text-white text-[15px] font-bold cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loading ? "Saving..." : `Save ${filledCount > 0 ? `(${filledCount})` : ""}`}
                    </button>
                )}
            </div>
        </div>
    );
}
