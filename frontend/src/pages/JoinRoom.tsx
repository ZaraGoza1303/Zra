// src/pages/JoinRoom.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Calendar, LogIn, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getRoomImageUrl } from '../services/api';

interface RoomDetail {
    id: string;
    name: string;
    picture: string | null;
    description: string;
    room_link: string;
    created_at: string;
    updated_at: string;
}

type PageState = 'loading' | 'invite' | 'already_member' | 'joining' | 'joined' | 'not_found' | 'error';

export default function JoinRoom() {
    const { roomId } = useParams<{ roomId: string }>();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [room, setRoom] = useState<RoomDetail | null>(null);
    const [pageState, setPageState] = useState<PageState>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [hasAutoJoinAttempted, setHasAutoJoinAttempted] = useState(false);

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

            // LANGSUNG redirect dengan parameter open, tanpa delay
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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const RoomAvatar = ({ size = 96 }: { size?: number }) => {
        if (room?.picture) {
            return (
                <img
                    src={getRoomImageUrl(room.picture)}
                    alt={room.name}
                    style={{
                        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid var(--primary)',
                        boxShadow: '0 0 0 6px rgba(59,130,246,0.15)',
                    }}
                />
            );
        }
        return (
            <div style={{
                width: size, height: size, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.38, fontWeight: 700, color: 'white',
                border: '3px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 0 6px rgba(59,130,246,0.15)',
            }}>
                {room?.name?.charAt(0).toUpperCase() ?? <Users size={size * 0.4} />}
            </div>
        );
    };

    return (
        <div className="flex-center w-full h-full animate-fade-in" style={{ padding: '20px', position: 'relative' }}>

            {/* Background Blobs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                <div style={{
                    position: 'absolute', top: '-20%', right: '-10%',
                    width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', left: '-10%',
                    width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
                }} />
            </div>

            {/* Panel */}
            <div className="glass-panel animate-slide-up" style={{
                width: '100%', maxWidth: '460px',
                overflow: 'hidden', position: 'relative', zIndex: 1,
            }}>
                {/* Top color band */}
                <div style={{ height: '8px', background: 'linear-gradient(90deg, var(--primary), #8b5cf6)' }} />

                {/* Content */}
                <div style={{ padding: '36px 32px 32px' }}>

                    {/* LOADING */}
                    {pageState === 'loading' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Loader size={40} style={{
                                margin: '0 auto 14px', color: 'var(--primary)', display: 'block',
                                animation: 'spin 1s linear infinite',
                            }} />
                            <p style={{ color: 'var(--text-muted)' }}>Loading room info...</p>
                        </div>
                    )}

                    {/* NOT FOUND */}
                    {pageState === 'not_found' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                margin: '0 auto 20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)',
                            }}>
                                <AlertCircle size={36} />
                            </div>
                            <h2 style={{ marginBottom: '8px' }}>Room Not Found</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
                                Invitation link is invalid or the room no longer exists.
                            </p>
                            <button className="btn btn-secondary w-full" onClick={() => navigate('/')}>
                                Back to Dashboard
                            </button>
                        </div>
                    )}

                    {/* ERROR */}
                    {pageState === 'error' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                margin: '0 auto 20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)',
                            }}>
                                <AlertCircle size={36} />
                            </div>
                            <h2 style={{ marginBottom: '8px' }}>Something Went Wrong</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
                                {errorMsg}
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={retryLoad}>Retry</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>Dashboard</button>
                            </div>
                        </div>
                    )}

                    {/* JOINING */}
                    {pageState === 'joining' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                <RoomAvatar size={72} />
                            </div>
                            <Loader size={28} style={{
                                margin: '0 auto 14px', color: 'var(--primary)', display: 'block',
                                animation: 'spin 1s linear infinite',
                            }} />
                            <p style={{ color: 'var(--text-muted)' }}>
                                Joining <strong style={{ color: 'var(--text-main)' }}>{room?.name}</strong>...
                            </p>
                        </div>
                    )}

                    {/* JOINED */}
                    {pageState === 'joined' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                margin: '0 auto 20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)',
                            }}>
                                <CheckCircle size={36} />
                            </div>
                            <h2 style={{ marginBottom: '8px' }}>Welcome aboard! 🎉</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
                                You've successfully joined{' '}
                                <strong style={{ color: 'var(--text-main)' }}>{room?.name ?? 'the room'}</strong>.
                            </p>
                            <button className="btn btn-primary w-full" onClick={() => navigate(`/?open=${roomId}`)}>
                                Open Room Chat
                            </button>
                        </div>
                    )}

                    {/* ALREADY MEMBER */}
                    {pageState === 'already_member' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                <RoomAvatar size={88} />
                            </div>
                            <h2 style={{ marginBottom: '8px' }}>{room?.name}</h2>
                            <p style={{
                                color: 'var(--success)', fontSize: '0.875rem', marginBottom: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            }}>
                                <CheckCircle size={14} /> You're already a member
                            </p>
                            {room?.description && (
                                <p style={{
                                    color: 'var(--text-muted)', lineHeight: 1.7,
                                    fontSize: '0.92rem', marginBottom: '20px', padding: '0 8px',
                                }}>
                                    {room.description}
                                </p>
                            )}
                            {room?.created_at && (
                                <div style={{
                                    display: 'flex', justifyContent: 'center', gap: '6px',
                                    fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '28px',
                                }}>
                                    <Calendar size={13} style={{ color: 'var(--primary)' }} />
                                    <span>Since {formatDate(room.created_at)}</span>
                                </div>
                            )}
                            <button className="btn btn-primary w-full" onClick={() => navigate(`/?open=${roomId}`)}>
                                Open Room Chat
                            </button>
                        </div>
                    )}

                    {/* INVITE PREVIEW */}
                    {pageState === 'invite' && room && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                <RoomAvatar size={96} />
                            </div>

                            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{room.name}</h2>

                            {room.description ? (
                                <p style={{
                                    color: 'var(--text-muted)', lineHeight: 1.7,
                                    fontSize: '0.92rem', marginBottom: '20px', padding: '0 8px',
                                }}>
                                    {room.description}
                                </p>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                                    No description provided.
                                </p>
                            )}

                            {/* Meta chips */}
                            <div style={{
                                display: 'flex', justifyContent: 'center', gap: '16px',
                                flexWrap: 'wrap', marginBottom: '24px', padding: '12px',
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: 'var(--border-radius-md)',
                                border: '1px solid var(--glass-border)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <Users size={13} style={{ color: 'var(--primary)' }} />
                                    <span>Group Room</span>
                                </div>
                                {room.created_at && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        <Calendar size={13} style={{ color: 'var(--primary)' }} />
                                        <span>Since {formatDate(room.created_at)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Auth notice */}
                            {!isAuthenticated && (
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    padding: '10px 14px', fontSize: '0.82rem',
                                    color: '#f59e0b', marginBottom: '20px', textAlign: 'left',
                                }}>
                                    ⚠️ You must be logged in to join this room.
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button className="btn btn-primary w-full" onClick={() => handleJoin()}>
                                    <LogIn size={18} />
                                    {isAuthenticated ? 'Join Room' : 'Login to Join'}
                                </button>
                                <button className="btn btn-secondary w-full" onClick={() => navigate('/')}>
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 32px',
                    borderTop: '1px solid var(--glass-border)',
                    textAlign: 'center', fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0,0,0,0.1)',
                }}>
                    ChatApp · Invitation Link
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}