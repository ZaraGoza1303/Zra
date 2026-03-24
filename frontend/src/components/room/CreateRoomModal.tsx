import { useState, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiCall } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import ImageCropModal from '../ImageCropModal';

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreated }: CreateRoomModalProps) {
    const { user } = useAuthStore();
    const { showToast } = useToastStore();
    const [creating, setCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDescription, setNewRoomDescription] = useState('');
    const [newRoomImage, setNewRoomImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName.trim() || !newRoomDescription.trim()) return;
        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('id', crypto.randomUUID());
            formData.append('owner_id', String(user?.id || 0));
            formData.append('name', newRoomName);
            if (newRoomDescription) formData.append('description', newRoomDescription);
            if (newRoomImage) formData.append('picture', newRoomImage);

            await apiCall('/room', { method: 'POST', body: formData });

            setNewRoomName('');
            setNewRoomDescription('');
            setNewRoomImage(null);
            showToast('Room created successfully', 'success');
            onClose();
            onCreated();
        } catch (err) {
            console.error('Create room failed', err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <div
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-md bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-[#e6edf3]">Create New Room</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3] transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Room Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. Gamers Indo"
                                value={newRoomName}
                                onChange={e => setNewRoomName(e.target.value)}
                                required
                                autoFocus
                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] placeholder-[#8b949e] text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Description</label>
                            <textarea
                                placeholder="What's this room about?"
                                value={newRoomDescription}
                                onChange={e => setNewRoomDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-[#e6edf3] placeholder-[#8b949e] text-sm focus:outline-none focus:border-blue-500/60 transition-colors resize-none font-[inherit]"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Room Image</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-[#8b949e]"
                            >
                                {newRoomImage ? (
                                    <>
                                        <span className="text-green-400 font-medium text-sm">✓ File Selected</span>
                                        <span className="text-xs truncate max-w-[200px]">{newRoomImage.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon size={24} className="opacity-50" />
                                        <span className="text-sm">Click to upload room picture</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => {
                                        if (e.target.files?.[0]) setCropFile(e.target.files[0]);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating || !newRoomName.trim() || !newRoomDescription.trim()}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20"
                            >
                                {creating ? 'Creating...' : 'Create Room'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onConfirm={(croppedFile: File) => {
                        setNewRoomImage(croppedFile);
                        setCropFile(null);
                    }}
                    onCancel={() => setCropFile(null)}
                />
            )}
        </>
    );
}
