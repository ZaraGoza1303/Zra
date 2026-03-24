import React from 'react';
import { Home, MessageSquare, Users, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getUserImageUrl } from '../../utils/imageUtils';
import { User } from 'lucide-react';

type NavItem = 'home' | 'rooms' | 'chats' | 'contacts' | 'settings';

interface NavSidebarProps {
    activeNav: NavItem;
    onNavChange: (nav: NavItem) => void;
    onOpenProfile: () => void;
    contactsNotif: number;
    unreadHomeOnly: number;
    unreadGroups: number;
    unreadPrivate: number;
}

export default function NavSidebar({
    activeNav,
    onNavChange,
    onOpenProfile,
    contactsNotif,
    unreadHomeOnly,
    unreadGroups,
    unreadPrivate,
}: NavSidebarProps) {
    const { user } = useAuthStore();

    const navItems: { key: NavItem; icon: React.ReactNode; label: string }[] = [
        { key: 'home', icon: <Home size={20} />, label: 'Home' },
        { key: 'rooms', icon: <MessageSquare size={20} />, label: 'Rooms' },
        { key: 'chats', icon: <MessageSquare size={20} />, label: 'Chats' },
        { key: 'contacts', icon: <Users size={20} />, label: 'Contacts' },
        { key: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    ];

    return (
        <div className="flex flex-col items-center py-5 px-2 gap-2 w-16 min-w-[64px] bg-[#0d1117] border-r border-white/5 z-10">
            <div
                onClick={() => onNavChange('home')}
                className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30 cursor-pointer hover:bg-blue-700 transition-colors"
            >
                <MessageSquare size={18} className="text-white" />
            </div>

            <div className="flex flex-col gap-1 flex-1">
                {navItems.slice(1).map(item => (
                    <button
                        key={item.key}
                        onClick={() => {
                            onNavChange(item.key);
                            if (item.key === 'settings') onOpenProfile();
                        }}
                        title={item.label}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group
                            ${activeNav === item.key
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-[#8b949e] hover:bg-white/5 hover:text-[#e6edf3]'
                            }`}
                    >
                        <div className="relative">
                            {item.icon}

                            {item.key === 'contacts' && contactsNotif > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                    {contactsNotif > 9 ? '9+' : contactsNotif}
                                </span>
                            )}
                            {item.key === 'home' && unreadHomeOnly > 0 && activeNav !== 'home' && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                    {unreadHomeOnly > 99 ? '99+' : unreadHomeOnly}
                                </span>
                            )}
                            {item.key === 'rooms' && unreadGroups > 0 && activeNav !== 'rooms' && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                    {unreadGroups > 99 ? '99+' : unreadGroups}
                                </span>
                            )}
                            {item.key === 'chats' && unreadPrivate > 0 && activeNav !== 'chats' && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                    {unreadPrivate > 99 ? '99+' : unreadPrivate}
                                </span>
                            )}
                        </div>
                        {activeNav === item.key && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full -ml-2" />
                        )}
                    </button>
                ))}
            </div>

            <button
                onClick={onOpenProfile}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-200 focus:outline-none"
                title={user?.name}
            >
                {user?.profile_picture ? (
                    <img
                        src={getUserImageUrl(user.profile_picture)}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-[#1c2128] border border-white/10 flex items-center justify-center text-[#8b949e]">
                        <User size={18} />
                    </div>
                )}
            </button>
        </div>
    );
}
