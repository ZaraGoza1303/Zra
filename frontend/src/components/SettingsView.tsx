// src/components/SettingsView.tsx
import React, { useState, useRef, useEffect } from "react";
import {
    Camera,
    HelpCircle,
    MoreVertical,
    Globe,
    Twitter,
    Plus,
    Shield,
    User as UserIcon,
    X,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { apiCall, getUserImageUrl } from "../services/api";
import { useToastStore } from "../store/toastStore";
import ImageCropModal from "./ImageCropModal";

export default function SettingsView() {
    const { user, token, loginState } = useAuthStore();
    const { showToast } = useToastStore();

    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(
        user?.profile_picture ? getUserImageUrl(user.profile_picture) : ""
    );

    const [loading, setLoading] = useState(false);
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [isCropOpen, setIsCropOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password change state
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Sync state when user object changes
    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setBio(user.bio || "");
            setPreviewUrl(
                user.profile_picture ? getUserImageUrl(user.profile_picture) : ""
            );
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                showToast("File must be an image", "error");
                return;
            }
            setTempFile(file);
            setIsCropOpen(true);
            e.target.value = "";
        }
    };

    const handleCropConfirm = (croppedFile: File) => {
        setProfilePicture(croppedFile);
        setPreviewUrl(URL.createObjectURL(croppedFile));
        setIsCropOpen(false);
        setTempFile(null);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("bio", bio);
            if (profilePicture) formData.append("profile_picture", profilePicture);

            const response = await apiCall<{ data: any }>(
                "/user",
                {
                    method: "PUT",
                    body: formData,
                }
            );

            if (user && token) {
                loginState(token, {
                    ...user,
                    name: response.data.name,
                    bio: response.data.bio,
                    profile_picture:
                        response.data.profile_picture || user.profile_picture,
                });
            }
            showToast("Profile updated successfully!", "success");
        } catch (err: any) {
            showToast(err.message || "Failed to update profile", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast("New password and confirm password do not match", "error");
            return;
        }

        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setPasswordLoading(true);
        try {
            await apiCall("/user/change-password", {
                method: "PUT",
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                }),
            });

            showToast("Password changed successfully!", "success");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setIsPasswordModalOpen(false);
        } catch (err: any) {
            showToast(err.message || "Failed to change password", "error");
        } finally {
            setPasswordLoading(false);
        }
    };

    // Placeholders for sections not yet implemented in backend
    const statusPlaceholder = "Online";

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'N/A';

    const isGoogleAccount = user?.provider === "google";

    return (
        <div className="flex-1 overflow-y-auto bg-[#0b0e11] text-[#f1f5f9] font-sans h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8">
                <h1 className="text-[#3b82f6] font-bold text-lg">Profile Settings</h1>
                <div className="flex items-center gap-6 text-[#94a3b8]">
                    <HelpCircle size={20} className="cursor-pointer hover:text-[#3b82f6] transition-colors" />
                    <MoreVertical size={20} className="cursor-pointer hover:text-[#3b82f6] transition-colors" />
                </div>
            </div>

            <div className="px-10 pb-12 max-w-[1200px]">
                {/* Page Title Section */}
                <div className="mb-10">
                    <h2 className="text-4xl font-bold mb-2">My Public Profile</h2>
                    <p className="text-[#94a3b8] text-sm">
                        Manage how you appear to others in Zra.
                    </p>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Card: Profile Summary */}
                    <div className="bg-[#161d28] rounded-[32px] p-10 flex flex-col items-center justify-center border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="relative mb-6">
                            <div
                                className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/5 cursor-pointer ring-4 ring-transparent group-hover:ring-[#536dfe]/20 transition-all duration-300"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#1c2635] flex items-center justify-center text-[#3b82f6]">
                                        <UserIcon size={48} />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#3b82f6] border-4 border-[#161d28] flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                            >
                                <Camera size={16} />
                            </button>
                        </div>

                        <h3 className="text-3xl font-bold mb-1">{user?.name || "Alex Chen"}</h3>

                        <div className="flex gap-3 w-full max-w-[320px]">
                            <div className="flex-1 bg-[#1c2635] rounded-2xl p-4 border border-white/5">
                                <p className="text-[10px] text-[#94a3b8] font-bold tracking-widest mb-1 uppercase text-center">Status</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    <span className="text-sm font-semibold">{statusPlaceholder}</span>
                                </div>
                            </div>
                            <div className="flex-1 bg-[#1c2635] rounded-2xl p-4 border border-white/5">
                                <p className="text-[10px] text-[#94a3b8] font-bold tracking-widest mb-1 uppercase text-center">Member Since</p>
                                <p className="text-sm font-semibold text-center">{memberSince}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Card: Profile Form */}
                    <div className="bg-[#161d28] rounded-[32px] p-10 border border-white/5 shadow-2xl">
                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] text-[#94a3b8] font-bold tracking-widest uppercase">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#0b0e11] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[#3b82f6]/40 outline-none transition-all placeholder:text-[#334155]"
                                    placeholder="e.g. Alex Chen"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-[#94a3b8] font-bold tracking-widest uppercase">Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={4}
                                    className="w-full bg-[#0b0e11] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[#3b82f6]/40 outline-none transition-all resize-none placeholder:text-[#334155]"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <button
                                    type="button"
                                    className="px-8 py-3 text-sm font-semibold hover:text-white transition-colors"
                                    onClick={() => {
                                        setName(user?.name || "");
                                        setBio(user?.bio || "");
                                        setPreviewUrl(user?.profile_picture ? getUserImageUrl(user.profile_picture) : "");
                                        setProfilePicture(null);
                                    }}
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#2563eb] hover:bg-[#1d4ed8] px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-[#2563eb]/20 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Password Card */}
                    <div className="bg-[#161d28] rounded-[32px] p-10 border border-white/5 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-[10px] text-[#94a3b8] font-bold tracking-widest uppercase">Password & Security</h3>
                                <p className="text-[#94a3b8] text-sm mt-2">
                                    {isGoogleAccount
                                        ? "Password is managed by your Google account."
                                        : "Change your password to keep your account secure."}
                                </p>
                            </div>
                            {!isGoogleAccount && (
                                <button
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="bg-[#0b0e11] hover:bg-[#1c2635] px-6 py-3 rounded-2xl text-sm font-bold border border-white/5 transition-all"
                                >
                                    Change Password
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#0b0e11] rounded-2xl p-4 flex items-center justify-between border border-transparent hover:border-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#1c2635] flex items-center justify-center text-[#3b82f6]">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">Password</h4>
                                        <p className="text-xs text-[#3b82f6]/60 font-medium">
                                            {isGoogleAccount
                                                ? `Connected via Google`
                                                : `Last changed recently`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Portfolio & Links Card */}
                    <div className="bg-[#161d28] rounded-[32px] p-10 border border-white/5 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] text-[#94a3b8] font-bold tracking-widest uppercase">Portfolio & Links</h3>
                            <button className="text-[#3b82f6] flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity">
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#0b0e11] rounded-2xl p-4 flex items-center justify-between border border-transparent hover:border-white/5 transition-all group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#1c2635] flex items-center justify-center text-[#3b82f6]">
                                        <Globe size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">Personal Website</h4>
                                        <p className="text-xs text-[#3b82f6]/60 font-medium">alexpr.site</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#0b0e11] rounded-2xl p-4 flex items-center justify-between border border-transparent hover:border-white/5 transition-all group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#1c2635] flex items-center justify-center text-[#3b82f6]">
                                        <Twitter size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">Twitter</h4>
                                        <p className="text-xs text-[#3b82f6]/60 font-medium">twitter.com/alexpr</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Settings Banner (Footer) */}
                    <div className="lg:col-span-2 bg-[#161d28] rounded-[32px] p-8 border border-white/5 shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-[#0b0e11] flex items-center justify-center text-[#3b82f6]">
                                <Shield size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Privacy Settings</h3>
                                <p className="text-[#94a3b8] text-sm">
                                    Your profile is currently visible to everyone. You can change this in Privacy settings.
                                </p>
                            </div>
                        </div>
                        <button className="bg-[#0b0e11] hover:bg-[#1c2635] px-8 py-4 rounded-2xl text-sm font-bold border border-white/5 transition-all active:scale-95 shadow-lg">
                            Manage Privacy
                        </button>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {isCropOpen && tempFile && (
                <ImageCropModal
                    file={tempFile}
                    onConfirm={handleCropConfirm}
                    onCancel={() => setIsCropOpen(false)}
                />
            )}

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-md bg-[#161d28] border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Change Password</h2>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-[#8b949e] transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#94a3b8] ml-1">Current Password</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full bg-[#0b0e11] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[#2563eb]/40 outline-none transition-all placeholder:text-[#334155]"
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#94a3b8] ml-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#0b0e11] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[#2563eb]/40 outline-none transition-all placeholder:text-[#334155]"
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#94a3b8] ml-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#0b0e11] border border-transparent rounded-2xl px-6 py-4 text-sm focus:border-[#2563eb]/40 outline-none transition-all placeholder:text-[#334155]"
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword}
                                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10"
                            >
                                {passwordLoading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
