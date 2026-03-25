import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';

interface CallOverlayProps {
    partnerName: string;
    partnerPicture?: string;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    withVideo: boolean;
    isCaller: boolean;
    partnerMuted?: boolean; // ← BARU
    onEnd: () => void;
    onToggleMute: () => boolean;
    onToggleVideo: () => boolean;
}

export default function CallOverlay({
    partnerName, partnerPicture, localStream, remoteStream,
    withVideo, isCaller, partnerMuted = false, onEnd, onToggleMute, onToggleVideo
}: CallOverlayProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const miniLocalVideoRef = useRef<HTMLVideoElement>(null);
    const miniRemoteVideoRef = useRef<HTMLVideoElement>(null);
    const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [autoplayError, setAutoplayError] = useState(false);

    // --- Draggable state ---
    const MINIMIZED_W = 200;
    const MINIMIZED_H = 130;
    const dragRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (isMinimized && pos === null) {
            setPos({
                x: window.innerWidth - MINIMIZED_W - 24,
                y: window.innerHeight - MINIMIZED_H - 24,
            });
        }
        if (!isMinimized) setPos(null);
    }, [isMinimized]);

    const clampPos = useCallback((x: number, y: number) => ({
        x: Math.max(0, Math.min(x, window.innerWidth - MINIMIZED_W)),
        y: Math.max(0, Math.min(y, window.innerHeight - MINIMIZED_H)),
    }), []);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - (pos?.x ?? 0),
            y: e.clientY - (pos?.y ?? 0),
        };
        dragRef.current?.setPointerCapture(e.pointerId);
    }, [pos]);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging.current) return;
        setPos(clampPos(
            e.clientX - dragOffset.current.x,
            e.clientY - dragOffset.current.y,
        ));
    }, [clampPos]);

    const onPointerUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    // Attach streams to mini video refs when minimized
    useEffect(() => {
        if (isMinimized) {
            if (miniRemoteVideoRef.current && remoteStream) {
                miniRemoteVideoRef.current.srcObject = remoteStream;
            }
            if (miniLocalVideoRef.current && localStream) {
                miniLocalVideoRef.current.srcObject = localStream;
            }
        }
    }, [isMinimized, remoteStream, localStream]);

    useEffect(() => {
        const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isMinimized, isVideoOff]);

    useEffect(() => {
        if (!remoteStream) return;
        const audioTrack = remoteStream.getAudioTracks()[0];

        const attachAudio = async () => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
            if (!audioInstanceRef.current) {
                audioInstanceRef.current = new Audio();
                audioInstanceRef.current.autoplay = true;
                audioInstanceRef.current.muted = false;
            }
            const audioObj = audioInstanceRef.current;
            if (audioObj.srcObject !== remoteStream) audioObj.srcObject = remoteStream;
            try {
                await audioObj.play();
                setAutoplayError(false);
            } catch (err: any) {
                if (err.name === 'NotAllowedError') setAutoplayError(true);
            }
        };

        if (audioTrack?.muted) {
            audioTrack.onunmute = () => attachAudio();
        } else {
            attachAudio();
        }

        return () => {
            if (audioTrack) audioTrack.onunmute = null;
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                audioInstanceRef.current.srcObject = null;
                audioInstanceRef.current = null;
            }
        };
    }, [remoteStream, isMinimized]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const handleMute = () => setIsMuted(onToggleMute());
    const handleVideoToggle = () => setIsVideoOff(onToggleVideo());

    return (
        <div
            ref={dragRef}
            style={
                isMinimized && pos
                    ? {
                        position: 'fixed',
                        left: pos.x,
                        top: pos.y,
                        width: MINIMIZED_W,
                        height: MINIMIZED_H,
                        zIndex: 100,
                        cursor: isDragging.current ? 'grabbing' : 'grab',
                        touchAction: 'none',
                        userSelect: 'none',
                    }
                    : undefined
            }
            className={`${isMinimized
                ? 'rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-light)]'
                : 'fixed inset-0 z-[100] bg-[var(--bg-primary)] overflow-hidden'
                }`}
            onPointerDown={isMinimized ? onPointerDown : undefined}
            onPointerMove={isMinimized ? onPointerMove : undefined}
            onPointerUp={isMinimized ? onPointerUp : undefined}
        >
            {/* ── FULL SCREEN MODE ── */}
            <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${isMinimized ? 'hidden' : ''}`}>
                <video ref={remoteVideoRef} autoPlay playsInline muted
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${(withVideo && remoteStream) ? 'opacity-100' : 'opacity-0'}`}
                />

                {withVideo && (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
                )}

                {(!withVideo || !remoteStream) && (
                    <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in duration-700">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute w-36 h-36 rounded-full border border-blue-500/20 animate-ping" />
                            {partnerPicture ? (
                                <img src={partnerPicture} alt={partnerName} className="w-24 h-24 rounded-full object-cover ring-2 ring-white/10 relative z-10" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center text-4xl font-bold text-[var(--text-primary)] relative z-10">
                                    {partnerName[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-[var(--text-primary)]">{partnerName}</p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                {remoteStream ? formatDuration(callDuration) : (isCaller ? 'Calling...' : 'Connecting...')}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Partner muted badge (fullscreen) ── */}
                {partnerMuted && (
                    <div className="absolute top-5 left-5 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 animate-in fade-in duration-300">
                        <MicOff size={13} className="text-red-400" />
                        <span className="text-xs text-white/80 font-medium">{partnerName} is muted</span>
                    </div>
                )}

                <button
                    onClick={() => setIsMinimized(true)}
                    className="absolute top-5 right-5 z-30 w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all hover:bg-black/60"
                >
                    <Minimize2 size={18} />
                </button>

                {withVideo && (
<div className="absolute bottom-32 right-6 w-32 h-44 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[var(--bg-tertiary)] z-20">
                            <video ref={localVideoRef} autoPlay playsInline muted
                                className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'hidden' : 'block'}`}
                            />
                            {isVideoOff && (
                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-primary)]">
                                    <VideoOff size={24} />
                                </div>
                            )}
                        </div>
                )}

                {autoplayError && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <button
                            onClick={() => audioInstanceRef.current?.play().then(() => setAutoplayError(false)).catch(console.error)}
                            className="px-6 py-4 bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/80 text-white rounded-full font-semibold flex items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.5)] transform hover:scale-105 transition-all"
                        >
                            <Mic size={24} className="animate-pulse" />
                            <span>Browser Blocked Audio. Click to Play!</span>
                        </button>
                    </div>
                )}

                <div className="absolute bottom-10 left-0 right-0 z-30 flex items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                    <button onClick={handleMute}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md
                        ${isMuted ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    >
                        {isMuted ? <MicOff size={26} /> : <Mic size={26} />}
                    </button>
                    <button onClick={onEnd}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-all duration-300 shadow-xl shadow-red-600/40 transform hover:scale-110 active:scale-95"
                    >
                        <PhoneOff size={32} />
                    </button>
                    {withVideo && (
                        <button onClick={handleVideoToggle}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md
                            ${isVideoOff ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                        >
                            {isVideoOff ? <VideoOff size={26} /> : <Video size={26} />}
                        </button>
                    )}
                </div>
            </div>

            {/* ── MINIMIZED MODE ── */}
            {isMinimized && (
                <div className="relative w-full h-full bg-[var(--bg-primary)]">
                    {withVideo && remoteStream ? (
                        <video
                            ref={miniRemoteVideoRef}
                            autoPlay playsInline muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]">
                            {partnerPicture ? (
                                <img src={partnerPicture} alt={partnerName}
                                    className="w-full h-full object-cover opacity-30" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center text-2xl font-bold text-[var(--text-primary)]">
                                    {partnerName[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                    {withVideo && localStream && (
                        <div className="absolute top-2 right-2 w-[52px] h-[68px] rounded-xl overflow-hidden border border-white/25 shadow-lg bg-[var(--bg-tertiary)] z-10">
                            {!isVideoOff ? (
                                <video
                                    ref={miniLocalVideoRef}
                                    autoPlay playsInline muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-primary)]">
                                    <VideoOff size={13} className="text-[var(--text-muted)]" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Partner muted badge (minimized) ── */}
                    {partnerMuted && (
                        <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center border border-red-500/40">
                            <MicOff size={11} className="text-red-400" />
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-2.5 py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="relative flex-shrink-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-white truncate leading-tight">{partnerName}</p>
                                <p className="text-[10px] text-green-400 font-mono leading-tight">{formatDuration(callDuration)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                                onClick={() => setIsMinimized(false)}
                                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Maximize2 size={13} />
                            </button>
                            <button
                                onClick={onEnd}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                            >
                                <PhoneOff size={13} />
                            </button>
                        </div>
                    </div>

                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white/25 pointer-events-none" />
                </div>
            )}
        </div>
    );
}