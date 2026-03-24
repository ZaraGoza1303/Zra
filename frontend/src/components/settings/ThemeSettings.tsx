import { 
    Sun, 
    Moon, 
    Palette, 
    Type, 
    MessageSquare,
    Check
} from 'lucide-react';
import { useThemeStore, ACCENT_COLORS, FONT_SIZES, DENSITY_OPTIONS, type AccentColor, type FontSize, type MessageDensity } from '../../store/themeStore';

const ACCENT_COLOR_OPTIONS = Object.entries(ACCENT_COLORS) as [AccentColor, string][];

export default function ThemeSettings() {
    const { 
        mode, 
        accentColor, 
        fontSize, 
        messageDensity,
        setMode, 
        setAccentColor, 
        setFontSize,
        setMessageDensity 
    } = useThemeStore();

    return (
        <div className="flex-1 overflow-y-auto bg-[#0b0d0f] text-[#f1f5f9] font-sans h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-white/5">
                <div>
                    <h1 className="text-[#3b82f6] font-bold text-lg">Appearance</h1>
                    <p className="text-[#94a3b8] text-sm mt-1">Customize how the app looks and feels</p>
                </div>
            </div>

            <div className="px-10 py-8 max-w-3xl">
                {/* Theme Mode Section */}
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        {mode === 'dark' ? <Moon size={20} className="text-[#3b82f6]" /> : <Sun size={20} className="text-[#3b82f6]" />}
                        <h2 className="text-lg font-semibold">Theme</h2>
                    </div>
                    <p className="text-[#94a3b8] text-sm mb-6">Choose your preferred color scheme</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setMode('dark')}
                            className={`relative p-6 rounded-2xl border-2 transition-all ${
                                mode === 'dark' 
                                    ? 'border-[#3b82f6] bg-[#161d28]' 
                                    : 'border-white/5 bg-[#0b0e11] hover:border-white/10'
                            }`}
                        >
                            {mode === 'dark' && (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center">
                                    <Check size={14} className="text-white" />
                                </div>
                            )}
                            <div className="w-full h-20 rounded-xl bg-[#0b0e11] border border-white/10 mb-3 flex items-center justify-center">
                                <Moon size={24} className="text-[#94a3b8]" />
                            </div>
                            <p className="font-medium">Dark</p>
                            <p className="text-xs text-[#94a3b8] mt-1">Easy on the eyes</p>
                        </button>

                        <button
                            onClick={() => setMode('light')}
                            className={`relative p-6 rounded-2xl border-2 transition-all ${
                                mode === 'light' 
                                    ? 'border-[#3b82f6] bg-[#161d28]' 
                                    : 'border-white/5 bg-[#0b0e11] hover:border-white/10'
                            }`}
                        >
                            {mode === 'light' && (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center">
                                    <Check size={14} className="text-white" />
                                </div>
                            )}
                            <div className="w-full h-20 rounded-xl bg-white border border-gray-200 mb-3 flex items-center justify-center">
                                <Sun size={24} className="text-yellow-500" />
                            </div>
                            <p className="font-medium">Light</p>
                            <p className="text-xs text-[#94a3b8] mt-1">Classic bright look</p>
                        </button>
                    </div>
                </section>

                {/* Accent Color Section */}
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Palette size={20} className="text-[#3b82f6]" />
                        <h2 className="text-lg font-semibold">Accent Color</h2>
                    </div>
                    <p className="text-[#94a3b8] text-sm mb-6">Choose your accent color</p>
                    
                    <div className="flex flex-wrap gap-3">
                        {ACCENT_COLOR_OPTIONS.map(([color]) => (
                            <button
                                key={color}
                                onClick={() => setAccentColor(color)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                    accentColor === color 
                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0b0d0f] scale-110' 
                                        : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: color }}
                            >
                                {accentColor === color && (
                                    <Check size={20} className="text-white" />
                                )}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm text-[#94a3b8] mt-3">
                        Selected: <span className="text-white font-medium">{ACCENT_COLORS[accentColor]}</span>
                    </p>
                </section>

                {/* Font Size Section */}
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Type size={20} className="text-[#3b82f6]" />
                        <h2 className="text-lg font-semibold">Font Size</h2>
                    </div>
                    <p className="text-[#94a3b8] text-sm mb-6">Adjust the text size</p>
                    
                    <div className="flex gap-3">
                        {(Object.entries(FONT_SIZES) as [FontSize, string][]).map(([size, label]) => (
                            <button
                                key={size}
                                onClick={() => setFontSize(size)}
                                className={`flex-1 py-4 px-6 rounded-2xl border-2 transition-all ${
                                    fontSize === size 
                                        ? 'border-[#3b82f6] bg-[#161d28]' 
                                        : 'border-white/5 bg-[#0b0e11] hover:border-white/10'
                                }`}
                            >
                                <p className={`font-medium ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'}`}>
                                    {label}
                                </p>
                                <p className="text-xs text-[#94a3b8] mt-1">
                                    {size === 'small' ? '13px' : size === 'large' ? '16px' : '14px'}
                                </p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Message Density Section */}
                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <MessageSquare size={20} className="text-[#3b82f6]" />
                        <h2 className="text-lg font-semibold">Message Density</h2>
                    </div>
                    <p className="text-[#94a3b8] text-sm mb-6">Control spacing in message lists</p>
                    
                    <div className="flex gap-3">
                        {(Object.entries(DENSITY_OPTIONS) as [MessageDensity, string][]).map(([density, label]) => (
                            <button
                                key={density}
                                onClick={() => setMessageDensity(density)}
                                className={`flex-1 py-4 px-6 rounded-2xl border-2 transition-all ${
                                    messageDensity === density 
                                        ? 'border-[#3b82f6] bg-[#161d28]' 
                                        : 'border-white/5 bg-[#0b0e11] hover:border-white/10'
                                }`}
                            >
                                <p className="font-medium">{label}</p>
                                <p className="text-xs text-[#94a3b8] mt-1">
                                    {density === 'compact' ? 'More messages visible' : 'Comfortable reading'}
                                </p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Preview Section */}
                <section>
                    <h2 className="text-lg font-semibold mb-4">Preview</h2>
                    <div 
                        className="p-6 rounded-2xl border border-white/5"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'var(--accent-color)' }}
                            >
                                <span className="text-white text-sm font-bold">A</span>
                            </div>
                            <div>
                                <p className="font-medium" style={{ fontSize: 'var(--font-size-base)' }}>Preview Message</p>
                                <p className="text-[#94a3b8]" style={{ fontSize: 'calc(var(--font-size-base) - 2px)' }}>
                                    This is how your messages will look
                                </p>
                            </div>
                        </div>
                        <div 
                            className="inline-block px-4 py-2 rounded-2xl"
                            style={{ 
                                backgroundColor: 'var(--accent-color)',
                                fontSize: 'var(--font-size-base)'
                            }}
                        >
                            <span className="text-white">Sample message bubble</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
