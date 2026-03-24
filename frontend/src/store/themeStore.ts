import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = '#3b82f6' | '#8b5cf6' | '#22c55e' | '#ef4444' | '#f97316' | '#ec4899';
export type FontSize = 'small' | 'medium' | 'large';
export type MessageDensity = 'compact' | 'comfortable';

export interface ThemeState {
  mode: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  messageDensity: MessageDensity;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setMessageDensity: (density: MessageDensity) => void;
  applyTheme: () => void;
}

const ACCENT_COLORS: Record<AccentColor, string> = {
  '#3b82f6': 'Blue',
  '#8b5cf6': 'Purple',
  '#22c55e': 'Green',
  '#ef4444': 'Red',
  '#f97316': 'Orange',
  '#ec4899': 'Pink',
};

export const FONT_SIZES: Record<FontSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const DENSITY_OPTIONS: Record<MessageDensity, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
};

export { ACCENT_COLORS };

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      accentColor: '#3b82f6',
      fontSize: 'medium',
      messageDensity: 'comfortable',

      setMode: (mode) => {
        set({ mode });
        get().applyTheme();
      },

      setAccentColor: (accentColor) => {
        set({ accentColor });
        get().applyTheme();
      },

      setFontSize: (fontSize) => {
        set({ fontSize });
        get().applyTheme();
      },

      setMessageDensity: (messageDensity) => {
        set({ messageDensity });
      },

      applyTheme: () => {
        const { mode, accentColor, fontSize } = get();
        
        const root = document.documentElement;
        
        // Apply mode (dark/light)
        if (mode === 'dark') {
          root.style.setProperty('--bg-primary', '#0b0e11');
          root.style.setProperty('--bg-secondary', '#161d28');
          root.style.setProperty('--bg-tertiary', '#1c2635');
          root.style.setProperty('--text-primary', '#f1f5f9');
          root.style.setProperty('--text-secondary', '#94a3b8');
          root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.05)');
        } else {
          root.style.setProperty('--bg-primary', '#ffffff');
          root.style.setProperty('--bg-secondary', '#f8fafc');
          root.style.setProperty('--bg-tertiary', '#f1f5f9');
          root.style.setProperty('--text-primary', '#1e293b');
          root.style.setProperty('--text-secondary', '#64748b');
          root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
        }

        // Apply accent color
        root.style.setProperty('--accent-color', accentColor);
        root.style.setProperty('--accent-hover', adjustColorBrightness(accentColor, -10));

        // Apply font size
        const fontSizes: Record<FontSize, string> = {
          small: '13px',
          medium: '14px',
          large: '16px',
        };
        root.style.setProperty('--font-size-base', fontSizes[fontSize]);
      },
    }),
    {
      name: 'chatapp_theme',
    }
  )
);

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
