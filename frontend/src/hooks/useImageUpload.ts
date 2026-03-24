import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

interface UseImageUploadOptions {
    onUpload: (url: string, caption?: string) => void;
}

export function useImageUpload({ onUpload }: UseImageUploadOptions) {
    const { token } = useAuthStore();
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const captionRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setPreviewFile(file);
        setPreviewUrl(url);
        setCaption('');

        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => captionRef.current?.focus(), 100);
    }, []);

    const handleCancel = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewFile(null);
        setPreviewUrl(null);
        setCaption('');
    }, [previewUrl]);

    const handleUpload = useCallback(async () => {
        if (!previewFile || uploading) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', previewFile);

            const res = await fetch(`${API_BASE_URL}/room/upload-image`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.message || 'Upload failed');

            onUpload(json.data, caption.trim() || undefined);
            handleCancel();
        } catch (err: any) {
            console.error('Upload failed:', err);
            alert(err.message || 'Gagal upload gambar. Coba lagi.');
        } finally {
            setUploading(false);
        }
    }, [previewFile, uploading, token, caption, onUpload, handleCancel]);

    const handleCaptionKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUpload();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    }, [handleUpload, handleCancel]);

    return {
        previewFile,
        previewUrl,
        caption,
        setCaption,
        uploading,
        fileInputRef,
        captionRef,
        handleFileChange,
        handleCancel,
        handleUpload,
        handleCaptionKeyDown,
    };
}
