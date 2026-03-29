import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database } from 'lucide-react';

export default function Landing() {
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.08 }
        );
        const els = document.querySelectorAll('.reveal');
        els.forEach((el) => observer.observe(el));
        return () => els.forEach((el) => observer.unobserve(el));
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (navRef.current) {
                if (window.scrollY > 20) {
                    navRef.current.classList.add('scrolled');
                } else {
                    navRef.current.classList.remove('scrolled');
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                html { scroll-behavior: smooth; }

                /* Landing-scoped overrides */
                .landing-root {
                    --l-bg: var(--color-background);
                    --l-surface: var(--color-surface);
                    --l-surface-2: var(--color-surface-container);
                    --l-surface-high: var(--color-surface-container-high);
                    --l-border: var(--color-glass-border);
                    --l-border-hover: rgba(255,255,255,0.13);
                    --l-text: var(--color-on-surface);
                    --l-text-muted: var(--color-on-surface-variant);
                    --l-accent: var(--color-primary);
                    --l-accent-glow: rgba(133,173,255,0.18);
                    --l-secondary: var(--color-secondary);
                    --l-tertiary: var(--color-tertiary);
                }

                /* Reveal animations */
                .reveal {
                    opacity: 0;
                    transform: translateY(24px);
                    transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
                }
                .reveal.visible { opacity: 1; transform: translateY(0); }
                .reveal.d1 { transition-delay: 80ms; }
                .reveal.d2 { transition-delay: 160ms; }
                .reveal.d3 { transition-delay: 240ms; }
                .reveal.d4 { transition-delay: 320ms; }

                /* Navbar */
                .landing-nav {
                    border-bottom: 1px solid transparent;
                    background: rgba(14,14,14,0.8);
                    transition: border-bottom-color 0.3s ease, background 0.3s ease;
                }
                .landing-nav.scrolled {
                    border-bottom-color: var(--l-border);
                    background: rgba(14,14,14,0.92);
                }

                /* Feature card hover */
                .feature-card {
                    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease, box-shadow 0.3s ease;
                }
                .feature-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--l-border-hover) !important;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                }

                /* Button hover */
                .landing-btn-primary { transition: filter 0.2s ease, box-shadow 0.2s ease; }
                .landing-btn-primary:hover { filter: brightness(1.1); box-shadow: 0 0 28px rgba(133,173,255,0.4); }
                .landing-btn-ghost { transition: background 0.2s ease, border-color 0.2s ease; }
                .landing-btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); }

                /* Section divider */
                .section-divider {
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(to right, transparent, var(--l-border), transparent);
                }

                /* Chat bubble */
                @keyframes bubbleIn {
                    from { opacity: 0; transform: scale(0.96) translateY(6px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .chat-bubble-in { animation: bubbleIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }

                ::selection { background: rgba(133,173,255,0.25); }
                `
            }} />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

            <div className="landing-root" style={{ minHeight: '100vh', background: 'var(--l-bg)', color: 'var(--l-text)', fontFamily: "var(--font-headline), sans-serif" }}>

                {/* NAVBAR */}
                <nav ref={navRef} className="landing-nav fixed top-0 w-full z-50 backdrop-blur-xl shadow-[0px_10px_30px_rgba(133,173,255,0.08)]">
                    <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 24, fontWeight: 900, color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
                            <img src="/zra.svg" alt="Zra Logo" style={{ width: 32, height: 32 }} />
                            Zra
                        </div>
                        <div className="hidden md:flex items-center gap-8" style={{ fontWeight: 700 }}>
                            <a style={{ color: 'var(--l-accent)', borderBottom: '2px solid var(--l-accent)', paddingBottom: 4 }} href="#features">Features</a>
                            <a style={{ color: 'var(--l-text-muted)', transition: 'color 0.2s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--l-accent)'} onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--l-text-muted)'} href="#security">Security</a>
                            <a style={{ color: 'var(--l-text-muted)', transition: 'color 0.2s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--l-accent)'} onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--l-text-muted)'} href="#community">Community</a>
                            <a style={{ color: 'var(--l-text-muted)', transition: 'color 0.2s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--l-accent)'} onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--l-text-muted)'} href="/login">Pricing</a>
                        </div>
                        <Link to="/register" className="btn-gradient landing-btn-primary" style={{ padding: '10px 24px', borderRadius: 99, color: 'var(--color-on-primary)', fontWeight: 700, display: 'inline-block', transition: 'opacity 0.3s' }}>
                            Get Started
                        </Link>
                    </div>
                </nav>

                {/* HERO */}
                <main className="pt-20">
                    <section className="reveal d1" style={{ position: 'relative', minHeight: 921, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '48px 24px 0' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(133,173,255,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 10, maxWidth: 896, textAlign: 'center' }}>
                            <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: 'var(--l-surface-high)', border: '1px solid var(--l-border)', marginBottom: 24 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--l-accent)' }}>Atmospheric Precision</span>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(72px, 12vw, 160px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.85, color: 'var(--l-text)' }}>
                                    Zra
                                </h1>
                                <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--l-text)', marginTop: 8 }}>
                                    Chat, call, and <span className="text-gradient">connect.</span>
                                </h2>
                            </div>
                            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--l-text-muted)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 32px' }}>
                                One place for your community. Experience the future of communication with an interface designed to breathe.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                                <Link to="/login" className="btn-gradient landing-btn-primary" style={{ padding: '16px 32px', borderRadius: 99, color: 'var(--color-on-primary)', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center' }}>Log In</Link>
                                <Link to="/register" className="landing-btn-ghost" style={{ padding: '16px 32px', borderRadius: 99, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', background: 'var(--l-surface-high)', color: 'var(--l-text)', border: '1px solid var(--l-border)' }}>Sign Up</Link>
                            </div>
                        </div>

                        {/* Chat Interface Preview */}
                        <div style={{ position: 'relative', marginTop: 80, width: '100%', maxWidth: 1024, padding: '0 16px', zIndex: 10 }}>
                            <div className="glass-panel" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', border: '1px solid var(--l-border)' }}>
                                <div style={{ display: 'flex', height: 500 }}>
                                    {/* Sidebar */}
                                    <div style={{ width: 256, background: 'var(--l-surface)', display: 'none', flexDirection: 'column', padding: 16, gap: 16, borderRight: '1px solid var(--l-border)' }} className="md:flex md:flex-col">
                                        <div style={{ height: 32, width: 128, background: 'var(--l-surface-high)', borderRadius: 8, marginBottom: 16 }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ height: 40, width: '100%', background: 'rgba(133,173,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--l-accent)', flexShrink: 0 }} />
                                                <div style={{ height: 8, width: 80, background: 'rgba(133,173,255,0.4)', borderRadius: 99 }} />
                                            </div>
                                            {['96px', '64px'].map((w, i) => (
                                                <div key={i} style={{ height: 40, width: '100%', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                                                    <div style={{ height: 8, width: w, background: 'var(--l-text-muted)', opacity: 0.2, borderRadius: 99, marginLeft: 16 }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Main Chat */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(14,14,14,0.3)' }}>
                                        <header style={{ height: 64, borderBottom: '1px solid var(--l-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-on-secondary-container)' }}>GC</div>
                                                <span style={{ fontWeight: 700, color: 'var(--l-text)' }}>General Channel</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <span className="material-symbols-outlined" style={{ color: 'var(--l-text-muted)', cursor: 'pointer' }}>videocam</span>
                                                <span className="material-symbols-outlined" style={{ color: 'var(--l-text-muted)', cursor: 'pointer' }}>call</span>
                                            </div>
                                        </header>

                                        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
                                            <div className="animate-fade-in" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--l-surface-high)', flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--l-text)' }}>Alex Rivera</span>
                                                        <span style={{ fontSize: 10, color: 'var(--l-text-muted)' }}>12:45 PM</span>
                                                    </div>
                                                    <div style={{ background: 'var(--l-surface-high)', padding: '12px 16px', borderRadius: '0 12px 12px 12px', maxWidth: 384, color: 'var(--l-text)', border: '1px solid var(--l-border)', fontSize: 14 }}>
                                                        Has anyone seen the latest security architecture specs for the community nodes?
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="animate-fade-in" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'flex-end', animationDelay: '200ms', animationFillMode: 'both' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <span style={{ fontSize: 10, color: 'var(--l-text-muted)' }}>12:46 PM</span>
                                                        <span style={{ fontWeight: 700, color: 'var(--l-text)' }}>Sarah Chen</span>
                                                    </div>
                                                    <div style={{ background: 'var(--color-secondary-container)', padding: '12px 16px', borderRadius: '12px 0 12px 12px', maxWidth: 384, color: 'var(--color-on-secondary-container)', border: '1px solid rgba(133,173,255,0.2)', fontSize: 14 }}>
                                                        Just uploaded the file. It's built on a low-latency protocol with end-to-end encryption.
                                                    </div>
                                                </div>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-container)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-on-primary-container)' }}>SC</div>
                                            </div>
                                        </div>

                                        <div style={{ padding: 16 }}>
                                            <div style={{ background: 'var(--l-surface)', borderRadius: 99, height: 48, display: 'flex', alignItems: 'center', padding: '0 24px', border: '1px solid var(--l-border)', cursor: 'text' }}>
                                                <span style={{ color: 'var(--l-text-muted)', fontSize: 14 }}>Message #general...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="section-divider" style={{ maxWidth: 1200, margin: '0 auto' }} />

                    {/* FEATURES */}
                    <section id="features" className="reveal d2" style={{ padding: '128px 24px', maxWidth: 1152, margin: '0 auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
                            <div style={{ gridColumn: '1 / -1', marginBottom: 48 }}>
                                <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--l-text)' }}>
                                    Designed for what <span style={{ color: 'var(--l-text-muted)' }}>matters.</span>
                                </h2>
                            </div>

                            {[
                                { span: '1 / span 8', icon: 'chat_bubble', iconColor: 'var(--l-accent)', title: 'Real-time Messaging', titleSize: 28, desc: 'Zero-lag communication powered by our proprietary atmospheric sync engine. Whether it\'s one-on-one or a community of thousands, every message arrives with precision.' },
                                { span: '9 / span 4', icon: 'video_call', iconColor: 'var(--l-secondary)', title: 'Voice & Video Calls', titleSize: 22, desc: 'Crystal clear spatial audio and 4K video streaming that makes distance feel like a ghost of the past.' },
                                { span: '1 / span 4', icon: 'cloud_upload', iconColor: 'var(--l-tertiary)', title: 'File Sharing', titleSize: 22, desc: 'Drag, drop, and distribute. Large files are handled with enterprise-grade speed and encryption.' },
                                { span: '5 / span 8', icon: 'badge', iconColor: 'var(--l-accent)', title: 'Rich Profiles', titleSize: 28, desc: 'Express your digital identity with customizable banners, activity integration, and status themes that evolve with you.' },
                            ].map((card) => (
                                <div key={card.title} className="feature-card" style={{
                                    gridColumn: card.span,
                                    background: 'var(--l-surface)',
                                    padding: 40,
                                    borderRadius: 24,
                                    border: '1px solid var(--l-border)',
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: card.iconColor, marginBottom: 24, display: 'block', fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
                                    <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: card.titleSize, fontWeight: 700, marginBottom: 16, color: 'var(--l-text)' }}>{card.title}</h3>
                                    <p style={{ color: 'var(--l-text-muted)', lineHeight: 1.7, maxWidth: 480 }}>{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <div className="section-divider" />

                {/* PHILOSOPHY */}
                <section style={{ padding: '108px 24px', background: 'var(--l-surface)', borderTop: '1px solid var(--l-border)', borderBottom: '1px solid var(--l-border)' }}>
                    <div className="reveal" style={{ maxWidth: 780, margin: '0 auto' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--l-accent)', display: 'block', marginBottom: 32 }}>Our Philosophy</span>
                        <blockquote style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 44, color: 'var(--l-text)' }}>
                            "Built for{' '}
                            <span style={{ color: 'var(--l-accent)' }}>people</span>
                            , not just users. We design for the human need to belong in a space that respects focus."
                        </blockquote>
                    </div>
                </section>

                {/* SECURITY */}
                <section id="security" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>
                        {/* Visual placeholder */}
                        <div className="reveal" style={{ position: 'relative', height: 480, background: 'var(--l-surface)', borderRadius: 16, border: '1px solid var(--l-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                                <Shield size={48} color="var(--l-accent)" style={{ opacity: 0.3, marginBottom: 12 }} />
                                <span style={{ color: 'var(--l-text-muted)', fontSize: 14 }}>Security illustration</span>
                            </div>
                        </div>

                        {/* Text */}
                        <div className="reveal d2" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                            <div>
                                <h2 style={{ fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 20 }}>
                                    Security by{' '}
                                    <span style={{ color: 'var(--l-accent)' }}>Architecture.</span>
                                </h2>
                                <p style={{ fontSize: 15, color: 'var(--l-text-muted)', lineHeight: 1.75 }}>
                                    We don't just protect your data; we've built an infrastructure where privacy is the default state. Your community remains your own.
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {[
                                    { icon: <Shield size={15} />, title: 'End-to-End Encryption', desc: 'Military-grade protection for every word, image, and video file shared on our platform.' },
                                    { icon: <Database size={15} />, title: 'Sovereign Data', desc: 'We never sell your data. Our business model is built on providing value, not exploiting privacy.' },
                                ].map((item) => (
                                    <div key={item.title} style={{ display: 'flex', gap: 14 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--l-accent-glow)', color: 'var(--l-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{item.title}</h4>
                                            <p style={{ fontSize: 13, color: 'var(--l-text-muted)', lineHeight: 1.65 }}>{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider" />

                {/* CTA */}
                <section style={{ padding: '100px 24px' }}>
                    <div className="reveal" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', background: 'var(--l-surface)', border: '1px solid var(--l-border)', borderRadius: 20, padding: '72px 48px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, var(--l-accent-glow) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 16 }}>
                                Ready to try it?
                            </h2>
                            <p style={{ fontSize: 15, color: 'var(--l-text-muted)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 36px' }}>
                                Join over 2 million individuals and communities finding their home on Zra. Start building your space today.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Link to="/register" className="btn-gradient landing-btn-primary" style={{ color: 'var(--color-on-primary)', padding: '13px 28px', borderRadius: 99, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 24px var(--l-accent-glow)' }}>
                                    Get Started for Free
                                </Link>
                                <Link to="/login" className="landing-btn-ghost" style={{ border: '1px solid var(--l-border)', color: 'var(--l-text)', padding: '13px 28px', borderRadius: 99, fontSize: 14, fontWeight: 700, textDecoration: 'none', background: 'transparent' }}>
                                    View Demo
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer style={{ borderTop: '1px solid var(--l-border)', padding: '24px' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 15, letterSpacing: '0.1em', color: 'var(--l-accent)' }}>
                            <img src="/zra.svg" alt="Zra Logo" style={{ width: 22, height: 22 }} />
                            Zra
                        </div>
                        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                            {['Privacy Policy', 'Terms of Service', 'Security Architecture', 'Status'].map((link) => (
                                <span key={link} style={{ fontSize: 12, color: 'var(--l-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                                    onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--l-text)'}
                                    onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--l-text-muted)'}
                                >{link}</span>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--l-text-muted)' }}>
                            &copy; {new Date().getFullYear()} Zra Communications. Atmospheric Precision.
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
}