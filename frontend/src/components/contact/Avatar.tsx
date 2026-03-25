import { User as UserIcon } from 'lucide-react';
import { getUserImageUrl } from '../../services/api';

interface AvatarProps {
    src?: string;
    name: string;
    size?: number;
    className?: string;
}

export default function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
    return src ? (
        <img
            src={getUserImageUrl(src)}
            alt={name}
            style={{ width: size, height: size }}
            className={`rounded-full object-cover shrink-0 ${className}`}
            onError={e => { e.currentTarget.style.display = 'none'; }}
        />
    ) : (
        <div
            style={{ width: size, height: size }}
            className={`rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)] shrink-0 ${className}`}
        >
            <UserIcon size={size * 0.45} />
        </div>
    );
}