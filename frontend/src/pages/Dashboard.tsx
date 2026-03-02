// src/pages/Dashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { LogOut, Plus, Search, MessageSquare, Image as ImageIcon, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, getRoomImageUrl, getUserImageUrl } from '../services/api';
import ChatRoom from '../components/ChatRoom';
import ProfileModal from '../components/ProfileModal';
import { useSearchParams } from 'react-router-dom';

interface Room {
    id: string;
    name: string;
    picture: string | null;
    owner_id: number;
    description?: string;
}

export default function Dashboard() {
    const { user, logoutState } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDescription, setNewRoomDescription] = useState('');
    const [newRoomImage, setNewRoomImage] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        const roomIdToOpen = searchParams.get('open');

        // Jika ada ID room di URL dan daftar rooms sudah ter-load
        if (roomIdToOpen && rooms.length > 0) {
            const foundRoom = rooms.find(r => r.id === roomIdToOpen);
            if (foundRoom) {
                setSelectedRoom(foundRoom);
                setSearchParams({});
            }
        }
    }, [searchParams, rooms]);

    const fetchRooms = async () => {
        try {
            const res = await apiCall<{ data: Room[] }>(`/room?search=${searchTerm}`, { method: 'GET' });
            setRooms(res.data || []);
        } catch (err) {
            console.error('Failed to fetch rooms', err);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [searchTerm]);

    const handleLogout = async () => {
        try {
            await apiCall('/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user?.id, refresh_token: user?.refresh_token }),
            });
        } catch (e) {
            console.error(e);
        } finally {
            logoutState();
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;
        setCreating(true);
        try {
            const formData = new FormData();
            formData.append('id', crypto.randomUUID());
            formData.append('owner_id', String(user?.id || 0));
            formData.append('name', newRoomName);
            if (newRoomDescription) formData.append('description', newRoomDescription);
            if (newRoomImage) formData.append('picture', newRoomImage);

            await apiCall('/room', { method: 'POST', body: formData });

            setNewRoomName('');
            setNewRoomDescription('');
            setNewRoomImage(null);
            setIsModalOpen(false);
            fetchRooms();
        } catch (err) {
            console.error('Create room failed', err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex-center w-full h-full" style={{ padding: '20px' }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '1280px',
                height: '90vh',
                display: 'flex',
                overflow: 'hidden',
            }}>
                {/* SIDEBAR */}
                <div style={{
                    width: '320px',
                    minWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid var(--glass-border)',
                    background: 'rgba(15, 23, 42, 0.4)',
                }}>
                    {/* User Profile */}
                    <div
                        onClick={() => setIsProfileModalOpen(true)}
                        style={{
                            padding: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderBottom: '1px solid var(--glass-border)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{
                            width: '44px', height: '44px',
                            borderRadius: '50%', overflow: 'hidden',
                            border: '2px solid var(--primary)', flexShrink: 0,
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            {user?.profile_picture ? (
                                <img
                                    src={getUserImageUrl(user.profile_picture)}
                                    alt={user.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, var(--primary), #8b5cf6);color:white;font-weight:bold;">${user?.name?.charAt(0).toUpperCase()}</div>`;
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '100%', height: '100%',
                                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 'bold', fontSize: '1.1rem',
                                }}>
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{
                                fontWeight: 600, fontSize: '0.95rem',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{user?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● Online</div>
                        </div>
                        <button
                            className="btn-icon"
                            onClick={e => { e.stopPropagation(); setIsProfileModalOpen(true); }}
                            style={{ opacity: 0.7 }}
                        >
                            <Settings size={18} />
                        </button>
                    </div>

                    {/* Search & Actions */}
                    <div style={{ padding: '16px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--border-radius-md)',
                            marginBottom: '12px',
                        }}>
                            <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Search rooms..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: 'inherit', outline: 'none',
                                    width: '100%', fontSize: '0.9rem',
                                }}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsModalOpen(true)}
                            style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                        >
                            <Plus size={18} /> New Room
                        </button>
                    </div>

                    {/* Room List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {rooms.length === 0 ? (
                            <div style={{
                                padding: '40px 20px', textAlign: 'center',
                                color: 'var(--text-muted)', fontSize: '0.9rem',
                            }}>
                                No rooms found. Create one!
                            </div>
                        ) : (
                            rooms.map(room => (
                                <div
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    style={{
                                        padding: '12px 20px',
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        background: selectedRoom?.id === room.id
                                            ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                        borderLeft: selectedRoom?.id === room.id
                                            ? '4px solid var(--primary)' : '4px solid transparent',
                                    }}
                                    onMouseEnter={e => {
                                        if (selectedRoom?.id !== room.id)
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    }}
                                    onMouseLeave={e => {
                                        if (selectedRoom?.id !== room.id)
                                            e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {room.picture ? (
                                        <img src={getRoomImageUrl(room.picture)} alt={room.name}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'var(--secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0,
                                        }}>
                                            {room.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{
                                            fontWeight: 500, fontSize: '0.9rem',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>{room.name}</div>
                                        <div style={{
                                            fontSize: '0.75rem', color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>Tap to join chat</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Logout */}
                    <button
                        className="btn btn-secondary"
                        onClick={handleLogout}
                        style={{ margin: '16px', justifyContent: 'flex-start' }}
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>

                {/* CHAT AREA */}
                <div style={{
                    flex: 1, position: 'relative',
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    {selectedRoom ? (
                        <ChatRoom
                            roomId={selectedRoom.id}
                            roomName={selectedRoom.name}
                            roomPicture={getRoomImageUrl(selectedRoom.picture)}
                            onBack={() => setSelectedRoom(null)}
                        />
                    ) : (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', textAlign: 'center',
                        }}>
                            <div style={{
                                padding: '40px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '50%', marginBottom: '20px',
                            }}>
                                <MessageSquare size={64} style={{ opacity: 0.3 }} />
                            </div>
                            <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>
                                Select or Create a Room
                            </h2>
                            <p style={{ maxWidth: '300px', lineHeight: 1.5 }}>
                                Pick a conversation from the sidebar to start messaging your friends.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Room Modal */}
            {isModalOpen && (
                <div
                    onClick={() => setIsModalOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <div
                        className="glass-panel"
                        onClick={e => e.stopPropagation()}
                        style={{ width: '90%', maxWidth: '400px', padding: '28px' }}
                    >
                        <h2 style={{ marginBottom: '20px' }}>Create New Room</h2>
                        <form onSubmit={handleCreateRoom}>
                            <div className="input-group">
                                <label className="input-label">Room Name *</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. Gamers Indo"
                                    value={newRoomName}
                                    onChange={e => setNewRoomName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Description (Optional)</label>
                                <textarea
                                    className="input-field"
                                    placeholder="What's this room about?"
                                    value={newRoomDescription}
                                    onChange={e => setNewRoomDescription(e.target.value)}
                                    rows={3}
                                    style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Room Image (Optional)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: '2px dashed var(--glass-border)',
                                        padding: '30px',
                                        borderRadius: 'var(--border-radius-md)',
                                        cursor: 'pointer',
                                        background: 'rgba(0,0,0,0.3)',
                                        textAlign: 'center',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
                                >
                                    {newRoomImage ? (
                                        <div>
                                            <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '4px' }}>
                                                File Selected
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                                {newRoomImage.name}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', gap: '8px',
                                            color: 'var(--text-muted)',
                                        }}>
                                            <ImageIcon size={28} />
                                            <span>Click to upload room picture</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={e => {
                                            if (e.target.files?.[0]) setNewRoomImage(e.target.files[0]);
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating || !newRoomName.trim()}
                                    style={{ flex: 1 }}
                                >
                                    {creating ? 'Creating...' : 'Create Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}