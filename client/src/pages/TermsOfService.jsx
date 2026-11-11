import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    ArrowLeft, 
    CheckCircle, 
    ShieldCheck, 
    Shield,
    AlertTriangle, 
    FileText, 
    Mail, 
    ExternalLink,
    Clock,
    BookOpen
} from '../components/icons';

const TermsOfService = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSection, setActiveSection] = useState('acceptance');

    // Origin Memory: Track where user came from (e.g. /login, /settings)
    const returnPath = location.state?.from || sessionStorage.getItem('legal_return_path') || '/';
    
    useEffect(() => {
        if (location.state?.from && location.state.from !== '/terms' && location.state.from !== '/privacy') {
            sessionStorage.setItem('legal_return_path', location.state.from);
        }
    }, [location]);

    // Dynamic Back Button Label
    const getBackLabel = () => {
        if (returnPath === '/login') return 'Back to Sign In';
        if (returnPath.startsWith('/profile')) return 'Back to Profile';
        if (returnPath === '/settings') return 'Back to Settings';
        return 'Back to OtakuCircle';
    };

    const handleBack = () => {
        if (returnPath && returnPath !== '/terms' && returnPath !== '/privacy') {
            navigate(returnPath);
        } else if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    // Table of contents sections
    const sections = [
        { id: 'acceptance', title: '1. Acceptance of Terms', icon: CheckCircle },
        { id: 'accounts', title: '2. User Accounts & Security', icon: ShieldCheck },
        { id: 'conduct', title: '3. Community Conduct', icon: AlertTriangle },
        { id: 'ip', title: '4. Intellectual Property & APIs', icon: FileText },
        { id: 'liability', title: '5. Limitation of Liability', icon: Shield },
        { id: 'termination', title: '6. Termination & Inactivity', icon: Clock },
        { id: 'contact', title: '7. Contact & Support', icon: Mail }
    ];

    // Scroll spy for active section highlight
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 200;
            for (const section of sections) {
                const element = document.getElementById(section.id);
                if (element) {
                    const top = element.offsetTop;
                    const height = element.offsetHeight;
                    if (scrollPosition >= top && scrollPosition < top + height) {
                        setActiveSection(section.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -90;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-zinc-300 font-sans selection:bg-white/20 pb-24">
            
            {/* Top Navigation & Document Switcher Bar */}
            <div className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0d0d0d]/85 backdrop-blur-xl">
                <div className="max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between gap-4">
                    
                    {/* Origin-Aware Back Button */}
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-2 text-white hover:text-zinc-300 transition-all text-xs sm:text-sm font-semibold group cursor-pointer"
                    >
                        <div className="p-1.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                            <ArrowLeft size={15} />
                        </div>
                        <span>{getBackLabel()}</span>
                    </button>

                    {/* Document Switcher Pill */}
                    <div className="inline-flex p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-black shadow-md cursor-default">
                            Terms of Service
                        </span>
                        <Link 
                            to="/privacy" 
                            state={{ from: returnPath }}
                            className="px-4 py-1.5 rounded-full text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </Link>
                    </div>

                    {/* Metadata Version Pill */}
                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Effective Oct 2026 • v2.4</span>
                    </div>
                </div>
            </div>

            {/* Hero Header */}
            <div className="max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-16 pt-12 pb-10 border-b border-white/5">
                <div className="max-w-4xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                        <BookOpen size={14} /> Legal Agreement
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                        Terms of Service
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
                        Please review these terms carefully. By creating an account, browsing anime or movie catalogs, or using OtakuCircle’s tracking and social discovery tools, you agree to comply with this agreement.
                    </p>
                </div>
            </div>

            {/* Split Editorial Layout */}
            <div className="max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-16 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 items-start">
                    
                    {/* LEFT STICKY SIDEBAR (col-span-3) */}
                    <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-28 space-y-6">
                        
                        {/* Table of Contents */}
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 px-1">
                                On this page
                            </h3>
                            <nav className="space-y-1">
                                {sections.map((section) => {
                                    const isActive = activeSection === section.id;
                                    return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => scrollTo(section.id)}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                                isActive
                                                    ? 'bg-white/10 text-white font-semibold shadow-sm'
                                                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <span className="truncate">{section.title}</span>
                                            {isActive && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 ml-2" />
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Document Overview Metadata */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-xs">
                            <div className="flex justify-between items-center text-zinc-400">
                                <span>Estimated read</span>
                                <span className="text-zinc-200 font-medium">~4 minutes</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400">
                                <span>Jurisdiction</span>
                                <span className="text-zinc-200 font-medium">Global / Applicable Law</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400">
                                <span>Status</span>
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                                </span>
                            </div>
                        </div>

                        {/* Quick Contact Card */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 space-y-2.5">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                Legal Questions?
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Reach our team directly for legal or account inquiries:
                            </p>
                            <a
                                href="mailto:otakucircle.official@gmail.com"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors pt-1"
                            >
                                <Mail size={14} />
                                <span>otakucircle.official@gmail.com</span>
                            </a>
                        </div>
                    </aside>

                    {/* RIGHT MAIN READING CANVAS (col-span-9) */}
                    <main className="lg:col-span-8 xl:col-span-9 space-y-12">
                        
                        {/* Section 1: Acceptance */}
                        <section id="acceptance" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <CheckCircle size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    1. Acceptance of Terms
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    Welcome to OtakuCircle. By accessing or registering an account on our website, mobile interface, or associated APIs, you enter into a legally binding agreement governed by these Terms of Service.
                                </p>
                                <p>
                                    If you do not agree to these terms, you must discontinue using our services immediately. You represent and warrant that you are at least 13 years of age (or the minimum legal age required in your jurisdiction) to form a binding contract.
                                </p>
                            </div>

                            {/* Editorial Accent Block */}
                            <div className="border-l-4 border-blue-500 bg-blue-500/[0.04] p-5 sm:p-6 rounded-r-2xl space-y-1.5 text-sm text-zinc-300">
                                <span className="font-bold text-white block">Key Summary:</span>
                                <p className="leading-relaxed">
                                    Using OtakuCircle signifies your consent to these Terms and our Privacy Policy. If you are under the age of majority, your parent or legal guardian must review and approve these Terms on your behalf.
                                </p>
                            </div>
                        </section>

                        {/* Section 2: User Accounts */}
                        <section id="accounts" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    <ShieldCheck size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    2. User Accounts &amp; Security
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    You can access OtakuCircle by registering with a verified email address or through federated Google Sign-In authentication. You agree to maintain accurate information and safeguard your authentication credentials.
                                </p>
                                <ul className="space-y-2 text-sm text-zinc-300 list-disc list-inside pl-2">
                                    <li><strong className="text-white">Confidentiality:</strong> You are solely responsible for maintaining the confidentiality of your password and active login tokens.</li>
                                    <li><strong className="text-white">Account Activity:</strong> All activity occurring under your registered username is your responsibility. Report any unauthorized breach to support immediately.</li>
                                    <li><strong className="text-white">Account Deletion:</strong> You can permanently delete your account and all associated watch history at any time from your Account Settings.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 3: Community Conduct */}
                        <section id="conduct" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <AlertTriangle size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    3. Community Standards &amp; Prohibited Conduct
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    OtakuCircle is built to provide an enjoyable, welcoming space for anime fans, collectors, and movie enthusiasts worldwide. To maintain this environment, you agree not to engage in prohibited activities:
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 space-y-1.5 text-xs sm:text-sm">
                                        <span className="font-semibold text-red-300 flex items-center gap-1.5">
                                            ✕ Prohibited Conduct
                                        </span>
                                        <ul className="space-y-1 text-zinc-400 list-disc list-inside">
                                            <li>Harassing, threatening, or stalking other users</li>
                                            <li>Posting hateful, violent, or defamatory remarks</li>
                                            <li>Automated scraping or denial-of-service attempts</li>
                                            <li>Manipulating rating algorithms with bot farms</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1.5 text-xs sm:text-sm">
                                        <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                                            ✓ Expected Conduct
                                        </span>
                                        <ul className="space-y-1 text-zinc-400 list-disc list-inside">
                                            <li>Respectful social discourse and recommendations</li>
                                            <li>Fair reviews and authentic rating contributions</li>
                                            <li>Reporting bugs or vulnerabilities responsibly</li>
                                            <li>Honoring community member privacy settings</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Intellectual Property */}
                        <section id="ip" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <FileText size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    4. Intellectual Property &amp; Third-Party APIs
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    All anime and movie titles, artwork, character names, cover imagery, and promotional posters displayed across OtakuCircle remain the exclusive copyright of their respective creators, animation studios, manga publishers, and distributors.
                                </p>
                                <p>
                                    Metadata is retrieved via public APIs (such as AniList, Jikan/MyAnimeList public indices, and TMDB) under fair informational and non-commercial cataloging principles. OtakuCircle does not host, stream, or distribute pirated video or media files.
                                </p>
                            </div>
                        </section>

                        {/* Section 5: Limitation of Liability */}
                        <section id="liability" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-zinc-300">
                                    <Shield size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    5. Limitation of Liability &amp; Disclaimers
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    OtakuCircle is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. We do not guarantee uninterrupted server uptime, error-free recommendation scoring, or zero data latency during third-party API sync operations.
                                </p>
                                <p>
                                    To the maximum extent permitted by applicable law, OtakuCircle and its maintainers shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from your use of or inability to use the platform.
                                </p>
                            </div>
                        </section>

                        {/* Section 6: Termination */}
                        <section id="termination" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                    <Clock size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    6. Account Termination &amp; Suspension
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    We reserve the right to suspend or terminate accounts that violate our community conduct policies, engage in platform abuse, or attempt unauthorized system access.
                                </p>
                                <p>
                                    Users may terminate their account voluntarily at any time. Upon voluntary account deletion, all personal data, friendship associations, and watch logs are permanently removed from production databases.
                                </p>
                            </div>
                        </section>

                        {/* Section 7: Contact */}
                        <section id="contact" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5 pb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <Mail size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    7. Contact &amp; Inquiries
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    If you have questions, inquiries, or notices regarding these Terms of Service, please reach out to our team:
                                </p>
                                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 inline-flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
                                    <span className="text-zinc-400">Official Contact:</span>
                                    <a
                                        href="mailto:otakucircle.official@gmail.com"
                                        className="text-blue-400 font-semibold hover:underline flex items-center gap-1.5"
                                    >
                                        otakucircle.official@gmail.com
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </section>

                    </main>
                </div>
            </div>

            {/* Bottom Global Footer Navigation */}
            <div className="max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-16 pt-12 border-t border-white/5 mt-16 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
                <div>&copy; {new Date().getFullYear()} OtakuCircle. Built for anime &amp; cinema enthusiasts worldwide.</div>
                <div className="flex items-center gap-6">
                    <Link to="/privacy" state={{ from: returnPath }} className="hover:text-white transition-colors">Privacy Policy</Link>
                    <button type="button" onClick={handleBack} className="hover:text-white transition-colors cursor-pointer">{getBackLabel()}</button>
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                </div>
            </div>

        </div>
    );
};

export default TermsOfService;
