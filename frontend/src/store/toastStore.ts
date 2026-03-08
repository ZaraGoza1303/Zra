import { create } from 'zustand';

interface Toast {
    id: number;
    msg: string;
    type: 'success' | 'error' | 'info';
}

interface ToastStore {
    toasts: Toast[];
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    removeToast: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    showToast: (msg, type = 'success') => {
        const id = Date.now();
        set(state => ({ toasts: [...state.toasts, { id, msg, type }] }));
        setTimeout(() => {
            set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 3000);
    },
    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));