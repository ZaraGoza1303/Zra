import { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '../services/api';

export interface Sticker {
    id: string;
    name: string;
    url: string;
    category: string;
}

interface UseStickerPickerOptions {
    onSelect: (url: string) => void;
}

export function useStickerPicker({ onSelect }: UseStickerPickerOptions) {
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const initialized = useRef(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchStickers = useCallback(async (searchTerm = '', category = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (category) params.append('category', category);
            const url = params.toString() ? `/room/stickers?${params.toString()}` : '/room/stickers';
            const resp = await apiCall<{ data: Sticker[] }>(url, { method: 'GET' });
            setStickers(resp.data || []);
        } catch (e) {
            console.error('Failed to fetch stickers', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const initStickers = useCallback(async () => {
        if (initialized.current) return;
        setLoading(true);
        try {
            const resp = await apiCall<{ data: Sticker[] }>('/room/stickers', { method: 'GET' });
            const allStickers = resp.data || [];
            setStickers(allStickers);
            const cats = Array.from(new Set(allStickers.map((s) => s.category)));
            setCategories(cats);
            initialized.current = true;
        } catch (e) {
            console.error('Failed to fetch stickers', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialized.current) return;
        const timeout = setTimeout(() => {
            fetchStickers(search, selectedCategory);
        }, 400);
        return () => clearTimeout(timeout);
    }, [search, selectedCategory, fetchStickers]);

    const handleSelect = useCallback((url: string) => {
        onSelect(url);
    }, [onSelect]);

    const reset = useCallback(() => {
        setSearch('');
        setSelectedCategory('');
        setCategories([]);
        initialized.current = false;
    }, []);

    return {
        stickers,
        categories,
        search,
        setSearch,
        selectedCategory,
        setSelectedCategory,
        loading,
        searchRef,
        initStickers,
        handleSelect,
        reset,
    };
}
