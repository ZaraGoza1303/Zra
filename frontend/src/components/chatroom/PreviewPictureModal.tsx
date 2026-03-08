import React from 'react';
import { X } from 'lucide-react';

interface PreviewPictureModalProps {
    previewPicture: { file: File; url: string } | null;
    setPreviewPicture: (data: { file: File; url: string } | null) => void;
    handleUpdateRoom: (field: 'picture', value: File) => Promise<void>;
    editLoading: boolean;
}

export default function PreviewPictureModal({
    previewPicture,
    setPreviewPicture,
    handleUpdateRoom,
    editLoading
}: PreviewPictureModalProps) {
    if (!previewPicture) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setPreviewPicture(null)}
        >
            <div
                className="w-full max-w-[360px] bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-[#e6edf3]">Change Group Photo</h3>
                    <button
                        onClick={() => setPreviewPicture(null)}
                        className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-4 p-6">
                    <div className="w-32 h-32 rounded-[28px] overflow-hidden border border-white/10 shadow-xl">
                        <img src={previewPicture.url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-[#8b949e] text-center">
                        This will be the new group photo. Are you sure?
                    </p>
                </div>

                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={() => {
                            URL.revokeObjectURL(previewPicture.url);
                            setPreviewPicture(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            await handleUpdateRoom('picture', previewPicture.file);
                            URL.revokeObjectURL(previewPicture.url);
                            setPreviewPicture(null);
                        }}
                        disabled={editLoading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {editLoading ? 'Saving...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
