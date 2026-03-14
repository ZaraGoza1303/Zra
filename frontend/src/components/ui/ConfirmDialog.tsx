import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
    loading = false,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div
            onClick={onCancel}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
        >
            <div
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[380px] bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
                            <AlertTriangle size={16} className={variant === 'danger' ? 'text-red-400' : 'text-yellow-400'} />
                        </div>
                        <h3 className="text-[15px] font-semibold text-[#e6edf3]">{title}</h3>
                    </div>
                    <button onClick={onCancel} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5">
                    <p className="text-[14px] text-[#8b949e] leading-relaxed">{description}</p>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                            ${variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-yellow-600 hover:bg-yellow-700'
                            }`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}