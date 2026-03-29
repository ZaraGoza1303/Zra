import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database } from 'lucide-react';

const NAV_LINKS = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Philosophy', href: '#community', id: 'community' },
    { label: 'Security', href: '#security', id: 'security' },
    { label: 'Join', href: '#join', id: 'join' },
];

export default function Landing() {
    const navRef = useRef<HTMLElement>(null);
    const [activeSection, setActiveSection] = useState<string>('');

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }, []);

    // Reveal animation observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            },
            { threshold: 0.08 }
        );
        const els = document.querySelectorAll('.reveal');
        els.forEach((el) => observer.observe(el));
        return () => els.forEach((el) => observer.unobserve(el));
    }, []);

    // Scroll-based active section — reliable regardless of section height
    useEffect(() => {
        const getActive = () => {
            const scrollY = window.scrollY + 120; // offset for fixed navbar height
            let current = '';
            for (const { id } of NAV_LINKS) {
                const el = document.getElementById(id);
                if (el && el.offsetTop <= scrollY) current = id;
            }
            setActiveSection(current);
        };
        getActive();
        window.addEventListener('scroll', getActive, { passive: true });
        return () => window.removeEventListener('scroll', getActive);
    }, []);

    // Scrolled navbar style
    useEffect(() => {
        const handleScroll = () => {
            if (navRef.current) {
                navRef.current.classList.toggle('scrolled', window.scrollY > 20);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

            <div className="landing-root min-h-screen bg-[var(--l-bg)] text-[var(--l-text)] font-['var(--font-headline)',sans-serif]">

                {/* NAVBAR */}
                <nav ref={navRef} className="landing-nav fixed top-0 w-full z-50 backdrop-blur-xl shadow-[0px_10px_30px_rgba(133,173,255,0.08)]">
                    <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
                        <div className="flex items-center gap-2 text-2xl font-black text-[var(--l-accent)] tracking-widest">
                            <img src="/zra.svg" alt="Zra Logo" className="w-8 h-8" />
                            Zra
                        </div>
                        <div className="hidden md:flex items-center gap-8 font-bold">
                            {NAV_LINKS.map(({ label, href, id }) => (
                                <a
                                    key={id}
                                    href={href}
                                    className={`nav-link${activeSection === id ? ' active' : ''}`}
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                        <Link to="/login" className="btn-gradient landing-btn-primary px-6 py-2.5 rounded-full !text-white font-bold inline-block">
                            Get Started
                        </Link>
                    </div>
                </nav>

                {/* HERO */}
                <main className="pt-20">
                    <section className="reveal d1 relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden pt-12 px-6">
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(133,173,255,0.08)_0%,transparent_50%)]" />
                        <div className="relative z-10 max-w-4xl text-center">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-[var(--l-surface-high)] border border-[var(--l-border)] mb-6">
                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--l-accent)]">Open Beta</span>
                            </div>
                            <div className="mb-6">
                                <h1 className="font-['var(--font-headline)'] text-[clamp(72px,12vw,160px)] font-black tracking-[-0.04em] leading-[0.85] text-[var(--l-text)]">
                                    Zra
                                </h1>
                                <h2 className="font-['var(--font-headline)'] text-[clamp(28px,4vw,48px)] font-extrabold tracking-[-0.025em] text-[var(--l-text)] mt-2">
                                    Chat, share, and <span className="text-gradient">connect.</span>
                                </h2>
                            </div>
                            <p className="text-[clamp(16px,2vw,20px)] text-[var(--l-text-muted)] leading-relaxed max-w-2xl mx-auto mb-8">
                                A focused chat app for your group or community. Send messages, share files, and stay connected — all in one place.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                <Link to="/login" className="btn-gradient landing-btn-primary px-8 py-4 rounded-full !text-white font-bold text-lg flex items-center">Log In</Link>
                                <Link to="/register" className="landing-btn-ghost px-8 py-4 rounded-full font-bold text-lg flex items-center bg-[var(--l-surface-high)] text-[var(--l-text)] border border-[var(--l-border)]">Create Account</Link>
                            </div>
                        </div>
                    </section>

                    <div className="section-divider max-w-7xl mx-auto" />

                    {/* FEATURES */}
                    <section id="features" className="reveal d2 py-32 px-6 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="col-span-full mb-12">
                                <h2 className="font-['var(--font-headline)'] text-[clamp(32px,5vw,60px)] font-bold tracking-[-0.03em] text-[var(--l-text)]">
                                    Built for <span className="text-[var(--l-text-muted)]">everyday use.</span>
                                </h2>
                            </div>

                            {[
                                {
                                    spanClass: 'lg:col-span-8',
                                    icon: 'chat_bubble',
                                    iconColorClass: 'text-[var(--l-accent)]',
                                    title: 'Real-time Messaging',
                                    titleSizeClass: 'text-3xl',
                                    desc: 'Send and receive messages instantly with WebSocket-powered delivery. Supports text, reactions, and replies — whether in a private chat or a group room.',
                                },
                                {
                                    spanClass: 'lg:col-span-4',
                                    icon: 'groups',
                                    iconColorClass: 'text-[var(--l-secondary)]',
                                    title: 'Rooms & Groups',
                                    titleSizeClass: 'text-2xl',
                                    desc: 'Create rooms for your team, circle, or project. Manage members and keep conversations organized.',
                                },
                                {
                                    spanClass: 'lg:col-span-4',
                                    icon: 'attach_file',
                                    iconColorClass: 'text-[var(--l-tertiary)]',
                                    title: 'File Sharing',
                                    titleSizeClass: 'text-2xl',
                                    desc: 'Attach and share files directly in chat. Images, documents, and more — sent alongside your messages.',
                                },
                                {
                                    spanClass: 'lg:col-span-8',
                                    icon: 'badge',
                                    iconColorClass: 'text-[var(--l-accent)]',
                                    title: 'User Profiles',
                                    titleSizeClass: 'text-3xl',
                                    desc: 'Set a display name, avatar, bio, and social links. See who you\'re talking to at a glance with presence and last-seen status.',
                                },
                            ].map((card) => (
                                <div key={card.title} className={`feature-card bg-[var(--l-surface)] p-10 rounded-3xl border border-[var(--l-border)] ${card.spanClass}`}>
                                    <span className={`material-symbols-outlined text-4xl mb-6 block fill-icon ${card.iconColorClass}`}>{card.icon}</span>
                                    <h3 className={`font-['var(--font-headline)'] ${card.titleSizeClass} font-bold mb-4 text-[var(--l-text)]`}>{card.title}</h3>
                                    <p className="text-[var(--l-text-muted)] leading-relaxed max-w-lg">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <div className="section-divider" />

                {/* PHILOSOPHY */}
                <section id="community" className="py-[108px] px-6 bg-[var(--l-surface)] border-y border-[var(--l-border)]">
                    <div className="reveal max-w-[780px] mx-auto">
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--l-accent)] block mb-8">Our Philosophy</span>
                        <blockquote className="text-[clamp(26px,3.5vw,44px)] font-bold leading-tight tracking-[-0.02em] mb-11 text-[var(--l-text)]">
                            "Chat should feel like a place, not a product. We build Zra to be{' '}
                            <span className="text-[var(--l-accent)]">simple</span>
                            {' '}enough to disappear into the background, and solid enough to rely on."
                        </blockquote>
                    </div>
                </section>

                {/* SECURITY */}
                <section id="security" className="py-[100px] px-6 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="reveal relative h-[480px] bg-[var(--l-surface)] rounded-2xl border border-[var(--l-border)] overflow-hidden flex items-center justify-center">
                            <div className="text-center">
                                <Shield size={48} className="text-[var(--l-accent)] opacity-30 mb-3 mx-auto" />
                                <span className="text-[var(--l-text-muted)] text-sm">Security illustration</span>
                            </div>
                        </div>

                        <div className="reveal d2 flex flex-col gap-9">
                            <div>
                                <h2 className="text-[clamp(30px,3.5vw,46px)] font-extrabold tracking-[-0.025em] leading-snug mb-5">
                                    Security by{' '}
                                    <span className="text-[var(--l-accent)]">design.</span>
                                </h2>
                                <p className="text-[15px] text-[var(--l-text-muted)] leading-relaxed">
                                    Message content is encrypted at rest with AES. Your data stays on our servers and is never shared or sold to third parties.
                                </p>
                            </div>
                            <div className="flex flex-col gap-6">
                                {[
                                    { icon: <Shield size={15} />, title: 'AES Encryption at Rest', desc: 'Message content is stored encrypted. Even with database access, messages are not readable in plain text.' },
                                    { icon: <Database size={15} />, title: 'No Data Selling', desc: 'We do not sell or share your data. Your conversations are yours.' },
                                ].map((item) => (
                                    <div key={item.title} className="flex gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--l-accent-glow)] text-[var(--l-accent)] flex items-center justify-center shrink-0 mt-0.5">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold mb-1">{item.title}</h4>
                                            <p className="text-[13px] text-[var(--l-text-muted)] leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider" />

                {/* CTA / JOIN */}
                <section id="join" className="py-[100px] px-6">
                    <div className="reveal cta-box max-w-[720px] mx-auto text-center bg-[var(--l-surface)] border border-[var(--l-border)] rounded-[20px] py-[72px] px-12">
                        <div className="relative z-10">
                            <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.025em] mb-4">
                                Give it a try.
                            </h2>
                            <p className="text-[15px] text-[var(--l-text-muted)] leading-relaxed max-w-[400px] mx-auto mb-9">
                                Create an account and start chatting. It's free, no setup required.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <Link to="/register" className="btn-gradient landing-btn-primary !text-white px-7 py-3.5 rounded-full text-sm font-bold no-underline shadow-[0_0_24px_var(--l-accent-glow)]">
                                    Create Account
                                </Link>
                                <Link to="/login" className="landing-btn-ghost border border-[var(--l-border)] text-[var(--l-text)] px-7 py-3.5 rounded-full text-sm font-bold no-underline bg-transparent">
                                    Log In
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="border-t border-[var(--l-border)] p-6">
                    <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2 font-black text-[15px] tracking-widest text-[var(--l-accent)]">
                            <img src="/zra.svg" alt="Zra Logo" className="w-5 h-5" />
                            Zra
                        </div>
                        <div className="flex flex-wrap gap-7">
                            {['Privacy Policy', 'Terms of Service', 'Status'].map((link) => (
                                <span key={link} className="text-xs text-[var(--l-text-muted)] cursor-pointer transition-colors duration-200 hover:text-[var(--l-text)]">
                                    {link}
                                </span>
                            ))}
                        </div>
                        <div className="text-[11px] text-[var(--l-text-muted)]">
                            &copy; {new Date().getFullYear()} Zra
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
}