import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export const useNotificationSound = () => {
    const playNotificationSound = useCallback(() => {
        const settings = useSettingsStore.getState();
        
        if (!settings.sound) {
            return;
        }

        const audio = new Audio('/notif_sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => {
            console.warn('Failed to play notification sound:', err);
        });
    }, []);

    return { playNotificationSound };
};
