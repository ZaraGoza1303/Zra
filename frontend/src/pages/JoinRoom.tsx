// src/pages/JoinRoom.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CheckCircle, AlertCircle, Asterisk } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getRoomImageUrl } from '../services/api';
import type { RoomDetail } from '../types/chat';

type PageState = 'loading' | 'invite' | 'already_member' | 'joining' | 'joined' | 'not_found' | 'error';

export default function JoinRoom() {
    const { roomId } = useParams<{ roomId: string }>();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [room, setRoom] = useState<RoomDetail | null>(null);
    const [pageState, setPageState] = useState<PageState>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [hasAutoJoinAttempted, setHasAutoJoinAttempted] = useState(false);
    const [activeMemberCount, setActiveMemberCount] = useState<number | null>(null);
    const [allMemberCount, setAllMemberCount] = useState<number | null>(null);

    useEffect(() => {
        if (!roomId) { setPageState('not_found'); return; }
        const loadRoom = async () => {
            setPageState('loading');
            try {
                const resp = await apiCall<{ data: RoomDetail }>(`/room/${roomId}/preview`, { method: 'GET' });
                setRoom(resp.data);
                setPageState('invite');
            } catch (err: any) {
                if (err.status === 404) setPageState('not_found');
                else { setPageState('error'); setErrorMsg(err.message || 'Failed to load room information.'); }
            }
        };
        loadRoom();
    }, [roomId]);

    useEffect(() => {
        if (!room?.id) return;
        const fetchCounts = async () => {
            try {
                const [activeResp, allResp] = await Promise.all([
                    apiCall<{ data: number }>(`/room/${room.id}/active-members-count`, { method: 'GET' }),
                    apiCall<{ data: number }>(`/room/${room.id}/all-members-count`, { method: 'GET' }),
                ]);
                setActiveMemberCount(activeResp.data);
                setAllMemberCount(allResp.data);
            } catch (e) {
                console.log(e);
            }
        };
        fetchCounts();
    }, [room?.id]);

    useEffect(() => {
        if (isAuthenticated && room && !hasAutoJoinAttempted) {
            setHasAutoJoinAttempted(true);
            handleJoin(room.id);
        }
    }, [isAuthenticated, room, hasAutoJoinAttempted]);

    const handleJoin = async (manualId?: string) => {
        if (!isAuthenticated) {
            navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        const targetRoomId = manualId || room?.id || roomId;
        if (!targetRoomId) return;

        setPageState('joining');
        try {
            await apiCall(`/room/${targetRoomId}/join`, { method: 'POST' });
            setPageState('joined');

            setTimeout(() => {
                navigate(`/?open=${targetRoomId}`);
            }, 3000);

        } catch (err: any) {
            const msg: string = (err.message || '').toLowerCase();
            if (msg.includes('already') || msg.includes('sudah') || msg.includes('duplikat')) {
                setPageState('already_member');
            } else {
                setPageState('error');
                setErrorMsg(err.message || 'Failed to join room.');
            }
        }
    };

    useEffect(() => {
        if (isAuthenticated && pageState === 'already_member' && room) {
            console.log("Member terdeteksi, mengalihkan ke chat dengan parameter...");
            navigate(`/?open=${room.id}`);
        }
    }, [isAuthenticated, pageState, room, navigate]);

    const retryLoad = async () => {
        if (!roomId) return;
        setPageState('loading');
        setHasAutoJoinAttempted(false);
        try {
            const resp = await apiCall<{ data: RoomDetail }>(`/room/${roomId}/preview`, { method: 'GET' });
            setRoom(resp.data);
            setPageState('invite');
        } catch (err: any) {
            if (err.status === 404) setPageState('not_found');
            else { setPageState('error'); setErrorMsg(err.message || 'Failed to load room information.'); }
        }
    };

    // ─── Room Avatar ────────────────────────────────────────────────────────────
    const RoomAvatar = ({ size = 80 }: { size?: number }) => {
        if (room?.picture) {
            return (
                <img
                    src={getRoomImageUrl(room.picture)}
                    alt={room.name}
                    style={{ width: size, height: size }}
                    className="rounded-2xl object-cover"
                />
            );
        }
        return (
            <div
                style={{ width: size, height: size }}
                className="rounded-2xl bg-[#1c2128] border border-white/10 flex items-center justify-center text-[#8b949e]"
            >
                <Users size={size * 0.4} />
            </div>
        );
    };

    // ─── Wrapper card ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen w-full bg-[#0d1117] flex items-center justify-center p-6">
            <div className="w-full max-w-[450px] bg-[#111318] border border-white/8 rounded-2xl overflow-hidden shadow-2xl">

                {/* Card Header */}
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/5">
                    <Asterisk size={16} className="text-[#e6edf3]" />
                    <span className="text-xs font-bold tracking-[0.15em] text-[#e6edf3] uppercase">Room Invite</span>
                </div>

                {/* Card Body */}
                <div className="px-7 py-9">

                    {/* ── LOADING ── */}
                    {pageState === 'loading' && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="w-16 h-16 rounded-2xl bg-[#1c2128] border border-white/10 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-sm text-[#8b949e]">Loading room info...</p>
                        </div>
                    )}

                    {/* ── NOT FOUND ── */}
                    {pageState === 'not_found' && (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                <AlertCircle size={28} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#e6edf3] mb-1">Room Not Found</h2>
                                <p className="text-sm text-[#8b949e] leading-relaxed">
                                    Invitation link is invalid or the room no longer exists.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#1c2128] border border-white/10 hover:bg-[#252d37] transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    )}

                    {/* ── ERROR ── */}
                    {pageState === 'error' && (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                <AlertCircle size={28} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#e6edf3] mb-1">Something Went Wrong</h2>
                                <p className="text-sm text-[#8b949e] leading-relaxed">{errorMsg}</p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={retryLoad}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    Retry
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                    Dashboard
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── JOINING ── */}
                    {pageState === 'joining' && (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="relative">
                                <RoomAvatar size={80} />
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#111318]" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-[#8b949e]">
                                    Joining <span className="text-[#e6edf3] font-medium">{room?.name}</span>...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── JOINED ── */}
                    {pageState === 'joined' && (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                                <CheckCircle size={28} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#e6edf3] mb-1">Welcome aboard! 🎉</h2>
                                <p className="text-sm text-[#8b949e] leading-relaxed">
                                    You've successfully joined{' '}
                                    <span className="text-[#e6edf3] font-medium">{room?.name ?? 'the room'}</span>.
                                    <br />Redirecting you now...
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(`/?open=${roomId}`)}
                                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Open Room Chat
                            </button>
                        </div>
                    )}

                    {/* ── ALREADY MEMBER ── */}
                    {pageState === 'already_member' && (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="relative">
                                <RoomAvatar size={80} />
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#111318]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#e6edf3] mb-1">{room?.name}</h2>
                                <p className="text-sm text-green-400 flex items-center justify-center gap-1.5">
                                    <CheckCircle size={13} /> You're already a member
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(`/?open=${roomId}`)}
                                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Open Room Chat
                            </button>
                        </div>
                    )}

                    {/* ── INVITE PREVIEW ── */}
                    {pageState === 'invite' && room && (
                        <div className="flex flex-col items-center text-center gap-2.5">
                            {/* Room Avatar with online dot */}
                            <div className="relative mb-5">
                                <RoomAvatar size={80} />
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#111318]" />
                            </div>

                            {/* Room Name */}
                            <h2 className="text-xl font-bold text-[#e6edf3] mb-2">{room.name}</h2>

                            {/* Description */}
                            <p className="text-sm text-[#8b949e] leading-relaxed mb-4 px-2">
                                {room.description || 'Join this room to start chatting.'}
                            </p>

                            {/* Invite from badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c2128] border border-white/8 rounded-full mb-5">
                                <Users size={12} className="text-[#8b949e]" />
                                <span className="text-xs text-[#8b949e]">Invite from Room Link</span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 w-full mb-6">
                                <div className="flex flex-col items-center justify-center gap-1.5 py-5 px-3 bg-[#1c2128] border border-white/8 rounded-xl">
                                    <span className="text-2xl font-bold text-[#e6edf3]">
                                        {activeMemberCount !== null ? activeMemberCount : '—'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                        <span className="text-[10px] font-semibold tracking-widest text-[#8b949e] uppercase">Online</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-1.5 py-5 px-3 bg-[#1c2128] border border-white/8 rounded-xl">
                                    <span className="text-2xl font-bold text-[#e6edf3]">
                                        {allMemberCount !== null ? allMemberCount : '—'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                        <span className="text-[10px] font-semibold tracking-widest text-[#8b949e] uppercase">Members</span>
                                    </div>
                                </div>
                            </div>

                            {/* Auth notice */}
                            {!isAuthenticated && (
                                <div className="w-full flex items-center gap-2 px-4 py-3 mb-5 rounded-xl text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 text-left">
                                    ⚠️ You must be logged in to join this room.
                                </div>
                            )}

                            {/* CTA Buttons */}
                            <button
                                onClick={() => handleJoin()}
                                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#1c2535] hover:bg-[#213048] cursor-pointer border border-blue-500/20 transition-all duration-200 mb-3 shadow-lg"
                            >
                                Accept Invite
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="text-sm text-[#8b949e] hover:text-[#e6edf3] cursor-pointer transition-colors py-2"
                            >
                                No thanks, I'll browse first
                            </button>
                        </div>
                    )}
                </div>

                {/* Card Footer */}
                <div className="px-7 py-5 border-t border-white/5 bg-[#0d1117]/50">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-[#8b949e] uppercase text-center">
                        By joining, you agree to our community guidelines
                    </p>
                </div>
            </div>
        </div>
    );
}