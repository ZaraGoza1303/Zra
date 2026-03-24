import type { SearchedUser } from '../../types/contacts';

export default function StatusBadge({ status }: { status: SearchedUser['friendship_status'] }) {
    const map = {
        friend: { label: 'Friend', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
        pending_sent: { label: 'Requested', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        pending_received: { label: 'Wants to connect', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
        none: null,
    };
    const item = status ? map[status] : null;
    if (!item) return null;
    return (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${item.cls}`}>
            {item.label}
        </span>
    );
}