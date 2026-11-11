import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    ArrowLeft, 
    Shield, 
    Eye, 
    RefreshCw, 
    Lock, 
    Database, 
    UserCheck, 
    Trash2, 
    Mail, 
    ExternalLink,
    FileCheck
} from '../components/icons';

const LegalPrivacy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSection, setActiveSection] = useState('collection');

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
        { id: 'collection', title: '1. Information We Collect', icon: Eye },
        { id: 'usage', title: '2. How We Use Data', icon: RefreshCw },
        { id: 'google-api', title: '3. Google API & Limited Use', icon: Lock },
        { id: 'storage', title: '4. Storage & Encryption', icon: Database },
        { id: 'rights', title: '5. Your Rights & Controls', icon: UserCheck },
        { id: 'deletion', title: '6. Account & Data Deletion', icon: Trash2 },
        { id: 'contact', title: '7. Contact & Privacy Office', icon: Mail }
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
                        <Link 
                            to="/terms" 
                            state={{ from: returnPath }}
                            className="px-4 py-1.5 rounded-full text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                            Terms of Service
                        </Link>
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-black shadow-md cursor-default">
                            Privacy Policy
                        </span>
                    </div>

                    {/* Metadata Version Pill */}
                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Updated Oct 2026 • v2.4</span>
                    </div>
                </div>
            </div>

            {/* Hero Header */}
            <div className="max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-16 pt-12 pb-10 border-b border-white/5">
                <div className="max-w-4xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        <Shield size={14} /> Data Protection &amp; Privacy
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
                        Your privacy is fundamental to everything we build at OtakuCircle. This policy explains what information we collect, why we collect it, how it is encrypted and protected, and the full control you retain over your personal data.
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
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-2" />
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
                                <span className="text-zinc-200 font-medium">~5 minutes</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400">
                                <span>GDPR / CCPA</span>
                                <span className="text-emerald-400 font-semibold">Compliant</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400">
                                <span>Google Limited Use</span>
                                <span className="text-blue-400 font-semibold">Certified</span>
                            </div>
                        </div>

                        {/* Quick Contact Card */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 space-y-2.5">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                Privacy Officer
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Direct questions or data removal inquiries to our privacy lead:
                            </p>
                            <a
                                href="mailto:otakucircle.official@gmail.com"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors pt-1"
                            >
                                <Mail size={14} />
                                <span>otakucircle.official@gmail.com</span>
                            </a>
                        </div>
                    </aside>

                    {/* RIGHT MAIN READING CANVAS (col-span-9) */}
                    <main className="lg:col-span-8 xl:col-span-9 space-y-12">
                        
                        {/* Section 1: Information We Collect */}
                        <section id="collection" className="scroll-mt-28 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <Eye size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    1. Information We Collect
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    We collect only the minimum data essential to provide you with seamless social tracking and personalized discovery for anime and movies:
                                </p>
                                <div className="space-y-3 pt-1">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                                        <h4 className="text-white font-semibold text-sm">Account Credentials</h4>
                                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                            When signing up via email, we collect your unique username, email address, and cryptographically hashed password (via bcrypt with salted rounds). For Google Sign-In, we receive your verified Google display name, email, and Google account avatar.
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                                        <h4 className="text-white font-semibold text-sm">Watchlist &amp; Personal Tracking</h4>
                                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                            Anime and movies you mark as Watching, Completed, On-Hold, Dropped, or Plan-to-Watch, alongside custom ratings, episodes completed, and reviews.
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                                        <h4 className="text-white font-semibold text-sm">Social Connections &amp; Recommendations</h4>
                                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                            Friendships you accept, anime recommendations you send or receive from peers, and notification activity logs.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: How We Use Data */}
                        <section id="usage" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <RefreshCw size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    2. How We Use Your Data
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    Your information powers the core features of OtakuCircle. Specifically:
                                </p>
                                <ul className="space-y-2 text-sm text-zinc-300 list-disc list-inside pl-2">
                                    <li><strong className="text-white">Authentication &amp; Security:</strong> To verify your session identity, prevent automated spam, and deliver transactional verification OTPs.</li>
                                    <li><strong className="text-white">Personalized Machine Learning:</strong> To compute genre affinities and cosine similarity for tailored recommendations based on your completed titles.</li>
                                    <li><strong className="text-white">Social Interaction:</strong> To facilitate friend requests, shared watchlist comparisons, and mutual anime discoveries.</li>
                                </ul>

                                {/* Highlighted Callout */}
                                <div className="border-l-4 border-purple-500 bg-purple-500/[0.04] p-5 rounded-r-2xl space-y-1 text-sm text-zinc-300">
                                    <span className="font-bold text-white block">Zero Ad-Tech &amp; No Data Brokering:</span>
                                    <p className="leading-relaxed">
                                        OtakuCircle is 100% free of third-party advertising trackers and behavioral remarketing pixels. We do not sell, rent, or monetize your personal information under any circumstance.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Google API Services User Data Policy Compliance */}
                        <section id="google-api" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <Lock size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    3. Google API Services &amp; Limited Use Disclosure
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    OtakuCircle’s use and transfer of information received from Google APIs to any other app adheres to the{' '}
                                    <a 
                                        href="https://developers.google.com/terms/api-services-user-data-policy" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-1 font-semibold"
                                    >
                                        Google API Services User Data Policy
                                        <ExternalLink size={14} />
                                    </a>
                                    , including the Limited Use requirements.
                                </p>

                                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 via-black/40 to-transparent border border-blue-500/20 space-y-3">
                                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                                        <FileCheck size={18} className="text-blue-400" />
                                        <span>Limited Use Compliance Commitments:</span>
                                    </div>
                                    <ul className="space-y-2 text-xs sm:text-sm text-zinc-300 list-disc list-inside pl-2">
                                        <li>We only request basic authentication scopes (<code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">email</code>, <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">profile</code>, <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">openid</code>).</li>
                                        <li>We do not transfer Google user data to third parties, unless necessary to provide core features, comply with laws, or as part of a merger.</li>
                                        <li>We do not use or transfer Google user data for serving advertisements, including personalized, re-targeted, or interest-based ads.</li>
                                        <li>We do not permit humans to read your data unless you provide explicit consent for troubleshooting, it is necessary for security investigations, or required by law.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Storage & Encryption */}
                        <section id="storage" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    <Database size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    4. Data Storage &amp; Encryption Standards
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    All data transmitted between your browser and OtakuCircle is encrypted in transit using industry-standard Transport Layer Security (TLS 1.3 / HTTPS).
                                </p>
                                <p>
                                    In our databases, user passwords are protected with salted one-way cryptographic hashes. JSON Web Tokens (JWT) used for session authorization expire automatically and are securely validated on every protected API endpoint.
                                </p>
                            </div>
                        </section>

                        {/* Section 5: Your Rights & Controls */}
                        <section id="rights" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <UserCheck size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    5. Your Privacy Rights &amp; Controls
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    Regardless of where you reside, you have full ownership and autonomy over your data on OtakuCircle:
                                </p>
                                <ul className="space-y-2 text-sm text-zinc-300 list-disc list-inside pl-2">
                                    <li><strong className="text-white">Privacy Controls:</strong> Toggle whether your library and statistics are visible to friends from your Settings page.</li>
                                    <li><strong className="text-white">Access &amp; Export:</strong> Request a complete machine-readable copy of your watch history and profile data.</li>
                                    <li><strong className="text-white">Rectification:</strong> Edit your username, avatar, and password at any time via Account Settings.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 6: Account Deletion */}
                        <section id="deletion" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                                    <Trash2 size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    6. Right to Erasure &amp; Account Deletion
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    You have the unqualified right to request the permanent deletion of your account and all associated records.
                                </p>
                                <div className="p-5 rounded-2xl bg-red-500/[0.04] border border-red-500/20 space-y-2">
                                    <h4 className="text-sm font-semibold text-red-300">Self-Service Account Deletion:</h4>
                                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                                        Navigate to <strong className="text-white">Settings &rarr; Account &rarr; Delete Account</strong>. When confirmed, all your watch history, friend connections, ratings, and profile data are immediately and permanently erased from our production databases.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 7: Contact & Privacy Office */}
                        <section id="contact" className="scroll-mt-28 space-y-4 pt-4 border-t border-white/5 pb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <Mail size={22} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    7. Contact Our Privacy Office
                                </h2>
                            </div>
                            <div className="text-sm sm:text-base leading-relaxed text-zinc-300 space-y-4 pl-1">
                                <p>
                                    For any questions regarding this Privacy Policy, data subject requests under GDPR/CCPA, or compliance inquiries, please contact:
                                </p>
                                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 inline-flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
                                    <span className="text-zinc-400">Privacy &amp; Data Protection:</span>
                                    <a
                                        href="mailto:otakucircle.official@gmail.com"
                                        className="text-emerald-400 font-semibold hover:underline flex items-center gap-1.5"
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
                    <Link to="/terms" state={{ from: returnPath }} className="hover:text-white transition-colors">Terms of Service</Link>
                    <button type="button" onClick={handleBack} className="hover:text-white transition-colors cursor-pointer">{getBackLabel()}</button>
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                </div>
            </div>

        </div>
    );
};

export default LegalPrivacy;
