// src/components/SettingsView.tsx
import { useState, useEffect } from "react";
import {
    HelpCircle,
    MoreVertical,
    Plus,
    User as UserIcon,
    Pencil,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { getUserImageUrl, getSocialLinks, createSocialLinks, updateSocialLink, deleteSocialLink } from "../services/api";
import { useToastStore } from "../store/toastStore";
import AddSocialLinkModal from "./settings/AddSocialLinkModal";
import EditSocialLinkModal from "./settings/EditSocialLinkModal";
import EditProfileModal from "./settings/EditProfileModal";
import type { SocialLink, SocialPlatform } from "../types/chat";

const PLATFORMS: { id: SocialPlatform; name: string; color: string; urlPattern: RegExp }[] = [
    { id: "youtube", name: "YouTube", color: "#FF0000", urlPattern: /youtube\.com\/@?([^\/]+)/ },
    { id: "instagram", name: "Instagram", color: "#E4405F", urlPattern: /instagram\.com\/([^\/]+)/ },
    { id: "github", name: "GitHub", color: "#F0F6FC", urlPattern: /github\.com\/([^\/]+)/ },
    { id: "reddit", name: "Reddit", color: "#FF4500", urlPattern: /reddit\.com\/u\/([^\/]+)/ },
];

function extractUsername(url: string, platform: SocialPlatform): string {
    const platformConfig = PLATFORMS.find(p => p.id === platform);
    if (!platformConfig) return "";
    const match = url.match(platformConfig.urlPattern);
    return match ? match[1] : "";
}

export default function SettingsView() {
    const { user } = useAuthStore();
    const { mode } = useThemeStore();
    const isDark = mode === 'dark';
    const { showToast } = useToastStore();

    const [previewUrl] = useState<string>(
        user?.profile_picture ? getUserImageUrl(user.profile_picture) : ""
    );

    // Social links state
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [socialLinksLoading, setSocialLinksLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<{ type: "add" } | { type: "edit"; link: SocialLink } | null>(null);

    // Edit profile modal state
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    // Fetch social links
    useEffect(() => {
        const fetchSocialLinks = async () => {
            setSocialLinksLoading(true);
            try {
                const response = await getSocialLinks();
                if (response?.data) {
                    setSocialLinks(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch social links:", err);
            } finally {
                setSocialLinksLoading(false);
            }
        };
        fetchSocialLinks();
    }, []);

    // Social links handlers
    const handleAddSocialLinks = async (links: { type: SocialPlatform; url: string }[]) => {
        setSocialLinksLoading(true);
        try {
            await createSocialLinks(links);
            const response = await getSocialLinks();
            if (response?.data) {
                setSocialLinks(response.data);
            }
            showToast("Social links added successfully!", "success");
            setActiveModal(null);
        } catch (err: any) {
            showToast(err.message || "Failed to add social links", "error");
        } finally {
            setSocialLinksLoading(false);
        }
    };

    const handleUpdateSocialLink = async (linkId: number, data: { type?: string; url?: string }) => {
        setSocialLinksLoading(true);
        try {
            await updateSocialLink(linkId, data);
            const response = await getSocialLinks();
            if (response?.data) {
                setSocialLinks(response.data);
            }
            showToast("Social link updated successfully!", "success");
            setActiveModal(null);
        } catch (err: any) {
            showToast(err.message || "Failed to update social link", "error");
        } finally {
            setSocialLinksLoading(false);
        }
    };

    const handleDeleteSocialLink = async (linkId: number) => {
        setSocialLinksLoading(true);
        try {
            await deleteSocialLink(linkId);
            setSocialLinks(prev => prev.filter(l => l.id !== linkId));
            showToast("Social link deleted successfully!", "success");
            setActiveModal(null);
        } catch (err: any) {
            showToast(err.message || "Failed to delete social link", "error");
        } finally {
            setSocialLinksLoading(false);
        }
    };

    // Placeholders for sections not yet implemented in backend
    const statusPlaceholder = "Online";

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'N/A';

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

    return (
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8">
                <h1 className="text-[var(--accent-color)] font-bold text-lg">Profile Settings</h1>
                <div className="flex items-center gap-6 text-[var(--text-secondary)]">
                    <HelpCircle size={20} className="cursor-pointer hover:text-[var(--accent-color)] transition-colors" />
                    <MoreVertical size={20} className="cursor-pointer hover:text-[var(--accent-color)] transition-colors" />
                </div>
            </div>


            <div className="px-10 pb-12 max-w-[1200px]">
                {/* Page Title Section */}
                <div className="mb-10">
                    <h2 className="text-4xl font-bold mb-2">My Public Profile</h2>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Manage how you appear to others in Zra.
                    </p>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Card: Profile Summary */}
                    <div className="bg-[var(--bg-secondary)] rounded-[32px] p-10 flex flex-col items-center justify-center border border-[var(--border-color)] shadow-2xl relative overflow-hidden">
                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--border-color)] ring-4 ring-transparent">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-color)]">
                                        <UserIcon size={48} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 className="text-3xl font-bold mb-1">{user?.name || "Unknown"}</h3>

                        <div className="flex gap-3 w-full max-w-[320px] mb-6">
                            <div className="flex-1 bg-[var(--bg-tertiary)] rounded-2xl p-4 border border-[var(--border-color)]">
                                <p className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest mb-1 uppercase text-center">Status</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    <span className="text-sm font-semibold">{statusPlaceholder}</span>
                                </div>
                            </div>
                            <div className="flex-1 bg-[var(--bg-tertiary)] rounded-2xl p-4 border border-[var(--border-color)]">
                                <p className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest mb-1 uppercase text-center">Member Since</p>
                                <p className="text-sm font-semibold text-center">{memberSince}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsEditProfileOpen(true)}
                            className="px-8 py-3 rounded-2xl text-sm font-bold border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
                        >
                            Edit Profile
                        </button>
                    </div>

                    {/* Portfolio & Links Card */}
                    <div className="bg-[var(--bg-secondary)] rounded-[32px] p-10 border border-[var(--border-color)] shadow-2xl">
                        <div className="flex items-center justify-between mt-17 mb-8">
                            <h3 className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest uppercase">Social Links</h3>
                            <button
                                onClick={() => setActiveModal({ type: "add" })}
                                className="text-[var(--accent-color)] flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            {socialLinksLoading ? (
                                <div className="col-span-4 flex items-center justify-center py-4">
                                    <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                PLATFORMS.map((platform) => {
                                    const link = socialLinks.find(l => l.type === platform.id);
                                    const username = link ? extractUsername(link.url, platform.id) : null;

                                    let platformColor = platform.color;
                                    if (platform.id === 'github') {
                                        platformColor = isDark ? '#F0F6FC' : '#1e293b';
                                    }

                                    return (
                                        <div
                                            key={platform.id}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <div
                                                className={`relative w-20 h-20 rounded-full flex items-center justify-center group ${link
                                                    ? "ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] cursor-pointer"
                                                    : "bg-[var(--bg-primary)] border-2 border-dashed border-[var(--text-muted)] opacity-50 hover:opacity-100 transition-opacity"
                                                    }`}
                                                style={{
                                                    backgroundColor: link ? `${platformColor}20` : undefined,
                                                    borderColor: link ? platformColor : undefined,
                                                }}
                                                onClick={() => link && setActiveModal({ type: "edit", link })}
                                            >
                                                {link ? (
                                                    <>
                                                        <PlatformIcon platform={platform.id} color={platformColor} sizeClass="w-8 h-8" />
                                                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Pencil size={20} className="text-white" />
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>
                                            <span className={`text-xs font-medium truncate max-w-[80px] ${link ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                                                }`}>
                                                {username || ""}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Social Links Modals */}
            {activeModal?.type === "add" && (
                <AddSocialLinkModal
                    existingLinks={socialLinks}
                    onClose={() => setActiveModal(null)}
                    onSave={handleAddSocialLinks}
                    loading={socialLinksLoading}
                />
            )}

            {activeModal?.type === "edit" && (
                <EditSocialLinkModal
                    link={activeModal.link}
                    onClose={() => setActiveModal(null)}
                    onUpdate={handleUpdateSocialLink}
                    onDelete={handleDeleteSocialLink}
                    loading={socialLinksLoading}
                />
            )}

            {/* Edit Profile Modal */}
            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
            />
        </div>
    );
}
