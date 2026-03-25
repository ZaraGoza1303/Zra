import { X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface PreviewPictureModalProps {
    handleUpdateRoom: (field: 'picture', value: File) => Promise<void>;
}

export default function PreviewPictureModal({
    handleUpdateRoom
}: PreviewPictureModalProps) {
    const { previewPicture, setPreviewPicture, editLoading } = useChatStore();

    if (!previewPicture) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setPreviewPicture(null)}
        >
            <div
                className="w-full max-w-[360px] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Change Group Photo</h3>
                    <button
                        onClick={() => setPreviewPicture(null)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-4 p-6">
                    <div className="w-32 h-32 rounded-[28px] overflow-hidden border border-[var(--border-light)] shadow-xl">
                        <img src={previewPicture.url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] text-center">
                        This will be the new group photo. Are you sure?
                    </p>
                </div>

                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={() => {
                            URL.revokeObjectURL(previewPicture.url);
                            setPreviewPicture(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] transition-colors"
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
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent-color)] hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                        {editLoading ? 'Saving...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
