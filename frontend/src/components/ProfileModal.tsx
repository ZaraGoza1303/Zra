// src/components/ProfileModal.tsx
import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { apiCall, getUserImageUrl } from "../services/api";
import type { ProfileModalProps, UserProfile } from "../types/chat";
import { useToastStore } from "../store/toastStore";
import ImageCropModal from "./ImageCropModal";

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, token, loginState } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    user?.profile_picture ? getUserImageUrl(user.profile_picture) : "",
  );

  // Sync state when user object changes (e.g. after fetch)
  React.useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setPreviewUrl(
        user.profile_picture ? getUserImageUrl(user.profile_picture) : "",
      );
    }
  }, [user]);

  // Fetch latest profile when modal opens
  React.useEffect(() => {
    if (isOpen && user?.id) {
      const fetchProfile = async () => {
        try {
          const response = await apiCall<{ data: UserProfile }>(
            `/user/${user.id}`,
            { method: "GET" },
          );
          if (response.data && token) {
            loginState(token, {
              ...user,
              name: response.data.name,
              username: response.data.username,
              bio: response.data.bio,
              profile_picture: response.data.profile_picture,
            } as any);
          }
        } catch (err) {
          console.error("Failed to fetch profile:", err);
        }
      };
      fetchProfile();
    }
  }, [isOpen, user?.id, token, loginState]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tempFile, setTempFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToastStore();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("File must be an image");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setTempFile(file);
      setIsCropOpen(true);
      setError("");
      // Reset input so user can pick the same file again if they cancel
      e.target.value = "";
    }
  };

  const handleCropConfirm = (croppedFile: File) => {
    setProfilePicture(croppedFile);
    setPreviewUrl(URL.createObjectURL(croppedFile));
    setIsCropOpen(false);
    setTempFile(null);
  };

  const handleCropCancel = () => {
    setIsCropOpen(false);
    setTempFile(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio);
      if (profilePicture) formData.append("profile_picture", profilePicture);

      const response = await apiCall<{ data: UserProfile }>(
        `/user/${user?.id}`,
        {
          method: "PUT",
          body: formData,
        },
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
      showToast("Profile updated successfully!");
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiCall("/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      showToast("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Failed to change password", "error");
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({
    label,
    value,
    onChange,
    show,
    onToggle,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full px-4 py-3 pr-10 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        onClick={(e) =>
          !isCropOpen && e.target === e.currentTarget && onClose()
        }
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[620px] bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="text-base font-semibold text-[#e6edf3]">
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-4">
            {(["profile", "password"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setError("");
                  setSuccess("");
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                ${
                                  activeTab === tab
                                    ? "bg-white/10 text-[#e6edf3]"
                                    : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/5"
                                }`}
              >
                {tab === "profile" ? (
                  <UserIcon size={14} />
                ) : (
                  <Lock size={14} />
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Alerts */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                <span>⚠</span> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl text-sm text-green-400 bg-green-500/10 border border-green-500/20">
                <span>✓</span> {success}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <form
                onSubmit={handleUpdateProfile}
                className="flex flex-col gap-4"
              >
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-blue-500/50 transition-colors">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                          <User size={36} />
                        </div>
                      )}
                    </div>
                    {/* Camera Overlay */}
                    <div className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-[#1c2128] border-2 border-[#161b22] flex items-center justify-center text-[#8b949e] group-hover:text-blue-400 group-hover:bg-blue-600/20 transition-all">
                      <Camera size={13} />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8b949e]">
                    Click icon to change photo
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Username - Read Only */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      disabled
                      className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#8b949e] text-sm cursor-not-allowed opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-[#8b949e]">
                    Username cannot be changed
                  </p>
                </div>

                {/* Display Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#8b949e] text-sm cursor-not-allowed opacity-60"
                  />
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Tell something about yourself..."
                    className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] text-sm focus:outline-none focus:border-blue-500/60 transition-colors resize-none font-[inherit] placeholder-[#8b949e]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (name === user?.name &&
                        bio === (user?.bio || "") &&
                        !profilePicture)
                    }
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#1c2128] hover:bg-[#252d37] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* PASSWORD TAB */}
            {activeTab === "password" && (
              <form
                onSubmit={handleChangePassword}
                className="flex flex-col gap-4"
              >
                <PasswordField
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
                />
                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNewPassword}
                  onToggle={() => setShowNewPassword(!showNewPassword)}
                />
                <PasswordField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20"
                  >
                    <Lock size={14} className="inline mr-1.5" />
                    {loading ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {isCropOpen && tempFile && (
        <ImageCropModal
          file={tempFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
