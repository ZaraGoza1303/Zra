// Landing.tsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database, MessageSquare, Users, Paperclip, User } from 'lucide-react';
import Lenis from 'lenis';

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Philosophy', href: '#community', id: 'community' },
    { label: 'Security', href: '#security', id: 'security' },
    { label: 'Join', href: '#join', id: 'join' },
] as const;

const MARQUEE_ITEMS = [
    'Real-time Messaging', 'End-to-end Encryption', 'Group Rooms',
    'File Sharing', 'User Profiles', 'Read Receipts',
    'Instant Delivery', 'Private Chats', 'Reactions & Replies', 'Always Online',
];

const BENTO_CARDS = [
    {
        span: 'lg:col-span-7',
        chipClass: 'icon-chip-blue',
        Icon: MessageSquare,
        label: 'Messaging',
        title: 'Fast messaging',
        desc: 'Messages are delivered quickly using WebSocket. No manual refresh needed. Supports text, replies, reactions, and file attachments in private or group chats',
        accent: 'rgba(59,130,246,0.07)',
        large: true,
    },
    {
        span: 'lg:col-span-5',
        chipClass: 'icon-chip-purple',
        Icon: Users,
        label: 'Rooms',
        title: 'Rooms and groups',
        desc: 'Create rooms for your team or friends. Manage members, assign roles, and keep conversations organized',
        accent: 'rgba(139,92,246,0.07)',
        large: false,
    },
    {
        span: 'lg:col-span-5',
        chipClass: 'icon-chip-teal',
        Icon: Paperclip,
        label: 'Files',
        title: 'File sharing',
        desc: 'Send images, documents, or other files directly in chat. Files stay linked to the conversation',
        accent: 'rgba(52,211,153,0.07)',
        large: false,
    },
    {
        span: 'lg:col-span-7',
        chipClass: 'icon-chip-rose',
        Icon: User,
        label: 'Profiles',
        title: 'User profiles',
        desc: 'Set a display name, avatar, and basic info. See user status and last activity',
        accent: 'rgba(251,113,133,0.07)',
        large: true,
    },
] as const;

const SECURITY_ITEMS = [
    {
        Icon: Shield,
        chipClass: 'icon-chip-blue',
        title: 'AES Encryption at Rest',
        desc: 'Messages are stored in encrypted form in the database',
    },
    {
        Icon: Database,
        chipClass: 'icon-chip-purple',
        title: 'No Data Selling',
        desc: 'We do not share your data with third parties',
    },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function Landing() {
    const navRef = useRef<HTMLElement>(null);
    const lenisRef = useRef<Lenis | null>(null);
    const [activeSection, setActiveSection] = useState('');

    // Smooth scroll (Lenis)
    useEffect(() => {
        const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
        lenisRef.current = lenis;

        let raf: number;
        const tick = (time: number) => {
            lenis.raf(time);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            lenis.destroy();
        };
    }, []);

    // Reset scroll position on mount
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }, []);

    // Reveal animation on scroll into view
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
            { threshold: 0.08 },
        );
        const els = document.querySelectorAll('.reveal');
        els.forEach((el) => observer.observe(el));
        return () => els.forEach((el) => observer.unobserve(el));
    }, []);

    // Active nav link based on scroll position
    useEffect(() => {
        const update = () => {
            const scrollY = window.scrollY + 120;
            let current = '';
            for (const { id } of NAV_LINKS) {
                const el = document.getElementById(id);
                if (el && el.offsetTop <= scrollY) current = id;
            }
            setActiveSection(current);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    // Scrolled navbar border/bg
    useEffect(() => {
        const handle = () =>
            navRef.current?.classList.toggle('scrolled', window.scrollY > 20);
        window.addEventListener('scroll', handle, { passive: true });
        return () => window.removeEventListener('scroll', handle);
    }, []);

    // Smooth anchor scroll via Lenis
    const scrollTo = (id: string) => {
        lenisRef.current?.scrollTo(`#${id}`, { offset: -68 });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
                rel="stylesheet"
            />

            <div
                className="min-h-screen text-[var(--l-text)]"
                style={{ background: 'var(--l-bg)', fontFamily: "'Inter', sans-serif" }}
            >
                {/* NAVBAR */}
                <nav ref={navRef} className="landing-nav fixed top-0 w-full z-50 backdrop-blur-2xl">
                    <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-[68px]">
                        <div className="flex items-center gap-2.5">
                            <img src="/zra.svg" alt="Zra" className="w-7 h-7" />
                            <span
                                className="text-[15px] font-black tracking-widest uppercase"
                                style={{ color: 'var(--l-text)' }}
                            >
                                Zra
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-7">
                            {NAV_LINKS.map(({ label, id }) => (
                                <button
                                    key={id}
                                    onClick={() => scrollTo(id)}
                                    className={`nav-link${activeSection === id ? ' active' : ''}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <Link
                            to="/login"
                            className="landing-btn-primary btn-gradient text-white text-sm font-semibold px-5 py-2 rounded-full"
                        >
                            Get Started
                        </Link>
                    </div>
                </nav>

                <main className="pt-[68px]">
                    {/* HERO */}
                    <section className="reveal d1 relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden px-6 pt-10 pb-8">
                        <div className="hero-glow" />
                        <div
                            className="absolute inset-0 pointer-events-none opacity-[0.025]"
                            style={{
                                backgroundImage:
                                    'linear-gradient(var(--l-border) 1px, transparent 1px), linear-gradient(90deg, var(--l-border) 1px, transparent 1px)',
                                backgroundSize: '60px 60px',
                            }}
                        />

                        <div className="relative z-10 max-w-5xl text-center">

                            <h1
                                className="font-black leading-[0.9] tracking-[-0.04em] mb-6"
                                style={{ fontSize: 'clamp(64px, 11vw, 10px)' }}
                            >
                                <span className="text-gradient block">Simple messaging for every day</span>
                            </h1>

                            <p
                                className="leading-relaxed max-w-xl mx-auto mb-10"
                                style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--l-text-muted)' }}
                            >
                                Zra is a messaging app for everyday use.
                                Send messages, share files, and stay connected in one place
                            </p>

                            <div className="flex flex-wrap gap-3 justify-center">
                                <Link
                                    to="/register"
                                    className="landing-btn-primary btn-gradient !text-white font-semibold px-7 py-3 rounded-full text-sm"
                                >
                                    Start for free →
                                </Link>
                                <button
                                    onClick={() => scrollTo('features')}
                                    className="landing-btn-ghost text-sm font-semibold px-7 py-3 rounded-full border border-[var(--l-border)]"
                                    style={{ color: 'var(--l-text-muted)' }}
                                >
                                    See features
                                </button>
                            </div>
                        </div>

                        <div
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce"
                            style={{ color: 'var(--l-text-muted)', opacity: 0.4 }}
                        >
                            <div className="w-px h-8 rounded-full" style={{ background: 'var(--l-text-muted)' }} />
                        </div>
                    </section>

                    {/* MARQUEE */}
                    <div
                        className="marquee-wrapper py-5 border-y border-[var(--l-border)]"
                        style={{ background: 'var(--l-surface)' }}
                    >
                        <div className="marquee-track">
                            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                                <span
                                    key={i}
                                    className="flex items-center gap-5 px-6 text-[13px] font-medium whitespace-nowrap"
                                    style={{ color: 'var(--l-text-muted)' }}
                                >
                                    {item}
                                    <span
                                        className="w-1 h-1 rounded-full shrink-0"
                                        style={{ background: 'var(--l-border-hover)' }}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* FEATURES */}
                    <section id="features" className="reveal d2 py-28 px-6 max-w-6xl mx-auto">
                        <div className="mb-14">
                            <span
                                className="text-[11px] font-semibold tracking-[0.2em] uppercase block mb-4"
                                style={{ color: 'var(--l-accent)' }}
                            >
                                Features
                            </span>
                            <h2
                                className="font-black tracking-[-0.035em] leading-[0.95]"
                                style={{ fontSize: 'clamp(36px, 5vw, 64px)', color: 'var(--l-text)' }}
                            >
                                Made for {' '}
                                <span style={{ color: 'var(--l-text-muted)' }}>daily communication.</span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            {BENTO_CARDS.map((card) => (
                                <div
                                    key={card.title}
                                    className={`bento-card p-8 ${card.span}`}
                                    style={{ background: card.accent }}
                                >
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase mb-6 ${card.chipClass}`}>
                                        <card.Icon size={13} />
                                        {card.label}
                                    </div>
                                    <h3
                                        className={`font-black tracking-[-0.03em] mb-3 leading-tight ${card.large ? 'text-3xl' : 'text-2xl'}`}
                                        style={{ color: 'var(--l-text)' }}
                                    >
                                        {card.title}
                                    </h3>
                                    <p
                                        className="leading-relaxed text-[14px] max-w-md"
                                        style={{ color: 'var(--l-text-muted)' }}
                                    >
                                        {card.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <div className="section-divider" />

                {/* PHILOSOPHY */}
                <section
                    id="community"
                    className="py-28 px-6 border-y border-[var(--l-border)]"
                    style={{ background: 'var(--l-surface)' }}
                >
                    <div className="reveal max-w-3xl mx-auto">
                        <span
                            className="text-[11px] font-semibold tracking-[0.2em] uppercase block mb-8"
                            style={{ color: 'var(--l-accent)' }}
                        >
                            Our Philosophy
                        </span>
                        <blockquote
                            className="font-black tracking-[-0.03em] leading-[1.1] mb-8"
                            style={{ fontSize: 'clamp(28px, 4vw, 52px)', color: 'var(--l-text)' }}
                        >
                            "We focus on simple and usable chat"
                        </blockquote>
                        <p className="text-sm font-medium" style={{ color: 'var(--l-text-muted)' }}>
                            — Zra Team
                        </p>
                    </div>
                </section>

                {/* SECURITY */}
                <section id="security" className="py-24 px-6 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                        <div
                            className="absolute w-48 h-48 rounded-full blur-3xl opacity-20"
                            style={{ background: 'var(--l-accent)' }}
                        />
                        <div className="relative z-10 reveal d1 flex justify-center items-center">
                            <img src="/secure.avif" alt="Security" className="w-full max-w-sm h-auto object-contain drop-shadow-2xl" />
                        </div>

                        <div className="reveal d2 flex flex-col gap-8">
                            <div>
                                <span
                                    className="text-[11px] font-semibold tracking-[0.2em] uppercase block mb-5"
                                    style={{ color: 'var(--l-accent)' }}
                                >
                                    Security
                                </span>
                                <h2
                                    className="font-black tracking-[-0.03em] leading-[0.95] mb-4"
                                    style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--l-text)' }}
                                >
                                    Basic security
                                </h2>
                                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--l-text-muted)' }}>
                                    Your data is stored on our servers and protected. Messages are encrypted, and we do not sell your data
                                </p>
                            </div>

                            <div className="flex flex-col gap-5">
                                {SECURITY_ITEMS.map((item) => (
                                    <div key={item.title} className="flex gap-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.chipClass}`}>
                                            <item.Icon size={15} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--l-text)' }}>
                                                {item.title}
                                            </h4>
                                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--l-text-muted)' }}>
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider" />

                {/* JOIN / CTA */}
                <section id="join" className="py-24 px-6">
                    <div className="reveal cta-glow-card max-w-[680px] mx-auto py-20 px-10 text-center">
                        <div className="relative z-10">
                            <span
                                className="text-[11px] font-semibold tracking-[0.2em] uppercase block mb-6"
                                style={{ color: 'var(--l-accent)' }}
                            >
                                Get Started
                            </span>
                            <h2
                                className="font-black tracking-[-0.035em] leading-[0.95] mb-4"
                                style={{ fontSize: 'clamp(36px, 5vw, 60px)', color: 'var(--l-text)' }}
                            >
                                Start using Zra
                            </h2>
                            <p
                                className="text-[14px] leading-relaxed mx-auto mb-10 max-w-sm"
                                style={{ color: 'var(--l-text-muted)' }}
                            >
                                Create an account to start chatting
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <Link
                                    to="/register"
                                    className="landing-btn-primary btn-gradient !text-white font-semibold px-7 py-3 rounded-full text-sm"
                                >
                                    Create Account
                                </Link>
                                <Link
                                    to="/login"
                                    className="landing-btn-ghost text-sm font-semibold px-7 py-3 rounded-full border border-[var(--l-border)]"
                                    style={{ color: 'var(--l-text-muted)' }}
                                >
                                    Log In
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="border-t border-[var(--l-border)] py-7 px-6">
                    <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <img src="/zra.svg" alt="Zra" className="w-4 h-4 opacity-60" />
                            <span
                                className="text-[13px] font-black tracking-widest uppercase opacity-60"
                                style={{ color: 'var(--l-text)' }}
                            >
                                Zra
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-6">
                            {['Privacy Policy', 'Terms of Service', 'Status'].map((link) => (
                                <span
                                    key={link}
                                    className="text-xs cursor-pointer transition-colors duration-200"
                                    style={{ color: 'var(--l-text-muted)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--l-text)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--l-text-muted)')}
                                >
                                    {link}
                                </span>
                            ))}
                        </div>

                        <div className="text-[11px]" style={{ color: 'var(--l-text-muted)' }}>
                            © {new Date().getFullYear()} Zra
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}