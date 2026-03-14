import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';

interface CallOverlayProps {
    partnerName: string;
    partnerPicture?: string;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    withVideo: boolean;
    isCaller: boolean;
    onEnd: () => void;
    onToggleMute: () => boolean;
    onToggleVideo: () => boolean;
}

export default function CallOverlay({
    partnerName, partnerPicture, localStream, remoteStream,
    withVideo, isCaller, onEnd, onToggleMute, onToggleVideo
}: CallOverlayProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

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
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            const attemptPlay = () => {
                remoteVideoRef.current?.play().catch(e => {
                    console.warn("Autoplay diblokir, menunggu klik user...", e);
                });
            };

            attemptPlay();
        }
    }, [remoteStream]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const handleMute = () => {
        const muted = onToggleMute();
        setIsMuted(muted);
    };

    const handleVideoToggle = () => {
        const isNowOff = onToggleVideo();
        setIsVideoOff(isNowOff);
    };

    return (
        <div className={`fixed z-[100] transition-all duration-300 shadow-2xl overflow-hidden
            ${isMinimized
                ? "bottom-6 right-6 w-[240px] bg-[#161b22] border border-white/10 rounded-2xl h-auto p-3"
                : "inset-0 bg-[#0d1117]"
            }`}
        >
            {/* 1. AREA UTAMA (VIDEO) - Sekarang Full Screen */}
            <div className={`relative w-full h-full flex items-center justify-center overflow-hidden
                ${isMinimized ? "hidden" : ""}`}
            >
                {/* VIDEO REMOTE: Mengisi seluruh layar */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500
                        ${(withVideo && remoteStream) ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Gradient Overlay bawah agar tombol tetap terlihat jelas */}
                {!isMinimized && withVideo && (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
                )}

                {/* Tampilan Avatar jika Voice Call atau video belum siap */}
                {(!withVideo || !remoteStream) && (
                    <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in duration-700">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute w-36 h-36 rounded-full border border-blue-500/20 animate-ping" />
                            {partnerPicture ? (
                                <img src={partnerPicture} alt={partnerName} className="w-24 h-24 rounded-full object-cover ring-2 ring-white/10 relative z-10" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-[#1c2128] border border-white/10 flex items-center justify-center text-4xl font-bold text-[#e6edf3] relative z-10">
                                    {partnerName[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-[#e6edf3]">{partnerName}</p>
                            <p className="text-sm text-[#8b949e] mt-1">
                                {remoteStream ? formatDuration(callDuration) : (isCaller ? 'Calling...' : 'Connecting...')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tombol Minimize (Pojok Kanan Atas) */}
                <button
                    onClick={() => setIsMinimized(true)}
                    className="absolute top-6 right-6 z-30 w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all hover:bg-black/60"
                >
                    <Minimize2 size={18} />
                </button>

                {/* Local Video PiP (Kanan Bawah, naik sedikit supaya tidak tertutup tombol) */}
                {withVideo && (
                    <div className="absolute bottom-32 right-6 w-32 h-44 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#1c2128] z-20 transition-all">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'hidden' : 'block'}`}
                        />
                        {isVideoOff && (
                            <div className="w-full h-full flex items-center justify-center text-[#8b949e] bg-[#0d1117]">
                                <VideoOff size={24} />
                            </div>
                        )}
                    </div>
                )}

                {/* CONTROLS (Floating di atas video) */}
                <div className="absolute bottom-10 left-0 right-0 z-30 flex items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                    <button
                        onClick={handleMute}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md
                            ${isMuted
                                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                    >
                        {isMuted ? <MicOff size={26} /> : <Mic size={26} />}
                    </button>

                    <button
                        onClick={onEnd}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-all duration-300 shadow-xl shadow-red-600/40 transform hover:scale-110 active:scale-95"
                    >
                        <PhoneOff size={32} />
                    </button>

                    {withVideo && (
                        <button
                            onClick={handleVideoToggle}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md
                                ${isVideoOff
                                    ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                }`}
                        >
                            {isVideoOff ? <VideoOff size={26} /> : <Video size={26} />}
                        </button>
                    )}
                </div>
            </div>

            {/* --- AREA MINIMIZED (Hanya jika isMinimized) --- */}
            {isMinimized && (
                <div className="flex items-center gap-3">
                    <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                    <div className="relative flex-shrink-0">
                        {partnerPicture ? (
                            <img src={partnerPicture} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {partnerName[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{partnerName}</p>
                        <p className="text-[11px] text-green-400 font-mono">{formatDuration(callDuration)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsMinimized(false)} className="p-2 text-gray-400 hover:text-white"><Maximize2 size={16} /></button>
                        <button onClick={onEnd} className="p-2 text-red-500"><PhoneOff size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}