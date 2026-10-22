import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, Mail } from '../components/icons';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-zinc-300 font-sans selection:bg-white/20 pb-20">
            {/* Top Navigation Bar */}
            <div className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-white hover:text-zinc-300 transition-colors text-sm font-semibold">
                        <ArrowLeft size={16} /> Back to OtakuCircle
                    </Link>
                    <div className="text-xs text-zinc-500 font-mono">Effective: October 2026</div>
                </div>
            </div>

            {/* Header Banner */}
            <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                    <FileText size={14} /> User Agreement
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
                    Terms of Service
                </h1>
                <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
                    Please read these terms carefully before accessing or using OtakuCircle. By creating an account or browsing the platform, you agree to be bound by these terms.
                </p>
            </div>

            {/* Main Content Body */}
            <div className="max-w-4xl mx-auto px-6 space-y-10">

                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle size={18} className="text-blue-400" /> 1. Acceptance of Terms
                    </h2>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        OtakuCircle is a social anime and movie discovery and tracking platform. By accessing our services, you affirm that you are at least 13 years of age and agree to comply with all applicable local, national, and international laws and regulations.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-400" /> 2. User Accounts &amp; Security
                    </h2>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        When creating an account through email registration or Google Sign-In, you agree to provide accurate and complete information. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-yellow-400" /> 3. Community Standards &amp; Prohibited Conduct
                    </h2>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        OtakuCircle fosters a welcoming community for anime and movie enthusiasts. You agree not to:
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                        <li>Harass, abuse, or post defamatory content targeting other community members.</li>
                        <li>Attempt to bypass authentication, scrape data, or disrupt server infrastructure.</li>
                        <li>Use automated bots or scripts to manipulate ratings, scores, or recommendations.</li>
                    </ul>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText size={18} className="text-purple-400" /> 4. Intellectual Property
                    </h2>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        Anime and movie titles, posters, synopses, and promotional media displayed on OtakuCircle are the intellectual property of their respective creators, production studios, and distributors. Metadata is indexed through legitimate public APIs (such as TMDB and public anime archives) for informational and personal cataloging purposes.
                    </p>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Mail size={18} className="text-blue-400" /> 5. Contact &amp; Inquiries
                    </h2>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        Questions regarding these Terms of Service can be directed to:
                    </p>
                    <div className="mt-2 p-4 rounded-xl bg-black/40 border border-white/5 inline-block text-sm">
                        <span className="text-zinc-500">Email: </span>
                        <a href="mailto:otakucircle.official@gmail.com" className="text-blue-400 font-semibold hover:underline">
                            otakucircle.official@gmail.com
                        </a>
                    </div>
                </section>

            </div>

            {/* Footer */}
            <div className="max-w-4xl mx-auto px-6 pt-16 border-t border-white/5 mt-16 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
                <div>&copy; {new Date().getFullYear()} OtakuCircle. All rights reserved.</div>
                <div className="flex gap-6">
                    <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
                    <Link to="/" className="hover:text-zinc-300 transition-colors">Home</Link>
                    <Link to="/login" className="hover:text-zinc-300 transition-colors">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
