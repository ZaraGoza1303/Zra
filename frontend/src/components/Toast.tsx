import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export default function Toast() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border backdrop-blur-sm min-w-[260px] max-w-[400px]
                        ${toast.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : toast.type === 'error'
                                ? 'bg-red-500/15 text-red-400 border-red-500/20'
                                : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                        }`}
                >
                    {toast.type === 'success' && <CheckCircle size={15} className="shrink-0" />}
                    {toast.type === 'error' && <XCircle size={15} className="shrink-0" />}
                    {toast.type === 'info' && <Info size={15} className="shrink-0" />}
                    <span className="flex-1">{toast.msg}</span>
                    <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-70 transition-opacity">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}