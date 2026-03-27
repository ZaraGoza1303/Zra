import { useState, useRef } from "react";
import { X, Camera, User as UserIcon } from "lucide-react";
import { apiCall, getUserImageUrl } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import ImageCropModal from "../ImageCropModal";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function EditProfileModal({ isOpen, onClose, onSuccess }: EditProfileModalProps) {
    const { user, token, loginState } = useAuthStore();
    const { showToast } = useToastStore();

    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [previewUrl, setPreviewUrl] = useState(
        user?.profile_picture ? getUserImageUrl(user.profile_picture) : ""
    );
    const [loading, setLoading] = useState(false);
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [isCropOpen, setIsCropOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                showToast("File must be an image", "error");
                return;
            }
            setTempFile(file);
            setIsCropOpen(true);
        }
    };

    const handleCropConfirm = (croppedFile: File) => {
        setTempFile(croppedFile);
        const url = URL.createObjectURL(croppedFile);
        setPreviewUrl(url);
        setIsCropOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("bio", bio);
            formData.append("username", username);
            if (tempFile) {
                formData.append("file", tempFile);
            }

            const response = await apiCall<{ data: any }>("/user", {
                method: "PUT",
                body: formData,
            });

            if (user && token && response?.data) {
                loginState(token, {
                    ...user,
                    name: response.data.name || user.name,
                    username: response.data.username || user.username,
                    bio: response.data.bio || user.bio,
                    profile_picture: response.data.profile_picture || user.profile_picture,
                });
                showToast("Profile updated successfully!", "success");
                onSuccess?.();
                onClose();
            }
        } catch (err: any) {
            console.error("Failed to update profile:", err);
            showToast(err.message || "Failed to update profile", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-md bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-8 m-4 animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <div
                                    className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--border-color)] cursor-pointer ring-4 ring-transparent hover:ring-[var(--accent-color)]/20 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-color)]">
                                            <UserIcon size={36} />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--accent-color)] border-2 border-[var(--bg-secondary)] flex items-center justify-center text-white hover:scale-110 transition-transform"
                                >
                                    <Camera size={14} />
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <p className="text-xs text-[var(--text-muted)]">Click to change profile picture</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest uppercase">Username</label>
                            <div className="relative">
                                <span className="absolute left-3 top-6.5 -translate-y-1/2 text-[var(--text-muted)] font-medium">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl pl-7 pl-9 pr-6 py-4 text-sm focus:border-[var(--accent-color)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                                    placeholder="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest uppercase">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent-color)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                                placeholder="Your display name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-[var(--text-secondary)] font-bold tracking-widest uppercase">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                className="w-full bg-[var(--bg-primary)] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[var(--accent-color)] outline-none transition-all resize-none placeholder:text-[var(--text-muted)]"
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 rounded-2xl text-sm font-bold border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-[var(--accent-color)]/20 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {isCropOpen && tempFile && (
                <ImageCropModal
                    file={tempFile}
                    onCancel={() => setIsCropOpen(false)}
                    onConfirm={handleCropConfirm}
                />
            )}
        </>
    );
}
