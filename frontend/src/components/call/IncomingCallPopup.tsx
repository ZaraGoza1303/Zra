import { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallPopupProps {
    callerName: string;
    callerPicture?: string;
    withVideo: boolean;
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallPopup({ callerName, callerPicture, withVideo, onAccept, onReject }: IncomingCallPopupProps) {
    useEffect(() => {
        let ctx: AudioContext | null = null;
        let stopped = false;

        const ring = async () => {
            if (stopped) return;

            // Buat AudioContext di sini, bukan di luar
            if (!ctx) ctx = new AudioContext();

            // Resume kalau suspended (Firefox require ini)
            if (ctx.state === 'suspended') {
                try {
                    await ctx.resume();
                } catch {
                    return;
                }
            }

            if (stopped) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);

            setTimeout(ring, 1500);
        };

        // Delay sedikit biar browser tidak anggap ini bukan gesture
        const timeout = setTimeout(ring, 100);

        return () => {
            stopped = true;
            clearTimeout(timeout);
            ctx?.close();
        };
    }, []);

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="relative w-[320px] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-blue-500/30 animate-pulse" />
                </div>

                <div className="relative p-5">
                    {/* Header */}
                    <div className="flex items-center gap-1 mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium tracking-wide uppercase">
                            Incoming {withVideo ? 'Video' : 'Voice'} Call
                        </span>
                    </div>

                    {/* Caller info */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="relative">
                            {callerPicture ? (
                                <img src={callerPicture} alt={callerName} className="w-14 h-14 rounded-full object-cover ring-2 ring-green-500/40" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center text-2xl font-bold text-[var(--text-primary)]">
                                    {callerName[0]?.toUpperCase()}
                                </div>
                            )}
                            {/* Ripple */}
                            <span className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-ping" />
                        </div>
                        <div>
                            <p className="font-semibold text-[var(--text-primary)] text-base">{callerName}</p>
                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                {withVideo ? <Video size={11} /> : <Phone size={11} />}
                                {withVideo ? 'Video calling you...' : 'Voice calling you...'}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onReject}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 text-sm font-medium"
                        >
                            <PhoneOff size={16} />
                            Decline
                        </button>
                        <button
                            onClick={onAccept}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 hover:text-green-300 transition-all duration-200 text-sm font-medium"
                        >
                            {withVideo ? <Video size={16} /> : <Phone size={16} />}
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}