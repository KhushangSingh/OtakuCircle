import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, Lock, Database, Eye, RefreshCw, Trash2 } from '../components/icons';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-zinc-300 font-sans selection:bg-white/20 pb-20">
            {/* Top Navigation Bar */}
            <div className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-white hover:text-zinc-300 transition-colors text-sm font-semibold">
                        <ArrowLeft size={16} /> Back to OtakuCircle
                    </Link>
                    <div className="text-xs text-zinc-500 font-mono">Last updated: October 2026</div>
                </div>
            </div>

            {/* Header Banner */}
            <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
                    Privacy Policy
                </h1>
                <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
                    At OtakuCircle, your privacy is fundamental to our mission. This policy transparently explains what data we collect, how it is secured, and your rights over your personal information.
                </p>
            </div>

            {/* Main Content Body */}
            <div className="max-w-4xl mx-auto px-6 space-y-12">

                {/* Section 1 */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Eye size={20} />
                        </div>
                        <h2 className="text-xl font-bold">1. Information We Collect</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        When you use OtakuCircle, we collect only the necessary data required to provide and improve your social anime and movie tracking experience:
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                        <li><strong className="text-white">Account Information:</strong> When registering via email, we collect your username, email address, and encrypted password. When authenticating with Google, we collect your display name, email, and Google profile picture.</li>
                        <li><strong className="text-white">User Activity &amp; Cataloging:</strong> Anime and movies you add to your watchlist, watch history, custom ratings, reviews, and progress tracking.</li>
                        <li><strong className="text-white">Social Graph:</strong> Friend connections, friend recommendations, and in-app activity notifications.</li>
                        <li><strong className="text-white">Technical Logs:</strong> Standard server logs, IP addresses for security rate-limiting, and error diagnostics.</li>
                    </ul>
                </section>

                {/* Section 2 */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <RefreshCw size={20} />
                        </div>
                        <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        Your information is used strictly to provide the core services of OtakuCircle:
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                        <li>To authenticate your identity, prevent fraud, and manage your account sessions.</li>
                        <li>To save and synchronize your personal watchlist, ratings, and watch progress across devices.</li>
                        <li>To power personalized recommendation algorithms (via cosine similarity and genre matching).</li>
                        <li>To send critical account-related emails, such as One-Time Password (OTP) verification codes and password resets. We do <strong className="text-white">never</strong> send marketing spam.</li>
                    </ul>
                </section>

                {/* Section 3: Google User Data Compliance */}
                <section className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-2xl p-8 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Lock size={20} />
                        </div>
                        <h2 className="text-xl font-bold">3. Google API Services &amp; Limited Use Disclosure</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        OtakuCircle’s use and transfer of information received from Google APIs to any other app adheres to the{' '}
                        <a 
                            href="https://developers.google.com/terms/api-services-user-data-policy" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-400 underline hover:text-blue-300"
                        >
                            Google API Services User Data Policy
                        </a>
                        , including the Limited Use requirements.
                    </p>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-400 space-y-2">
                        <p>• We only request basic identification scopes (<code className="text-zinc-200">email</code>, <code className="text-zinc-200">profile</code>, <code className="text-zinc-200">openid</code>) to enable effortless Sign-in with Google.</p>
                        <p>• We do not sell your Google user data to data brokers, advertisers, or third-party marketing firms.</p>
                        <p>• Automated transactional emails (such as registration and reset OTP codes) are dispatched via secure Gmail REST API over encrypted HTTPS.</p>
                    </div>
                </section>

                {/* Section 4 */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Database size={20} />
                        </div>
                        <h2 className="text-xl font-bold">4. Data Storage &amp; Security</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        We implement industry-standard technical measures to safeguard your personal data:
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                        <li>All database traffic is encrypted in transit using TLS/SSL and stored in secure cloud clusters.</li>
                        <li>Passwords are hashed using salted bcrypt prior to storage; plaintext passwords are never saved.</li>
                        <li>Session authentication is managed using signed, short-lived JSON Web Tokens (JWT).</li>
                    </ul>
                </section>

                {/* Section 5 */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                            <Trash2 size={20} />
                        </div>
                        <h2 className="text-xl font-bold">5. Your Rights &amp; Data Deletion</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        You retain full control over your data on OtakuCircle:
                    </p>
                    <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                        <li><strong className="text-white">Account Deletion:</strong> You can delete your account, personal profile, and entire tracking history at any time through Account Settings or by emailing us.</li>
                        <li><strong className="text-white">Data Portability:</strong> You may request an export of your watch history and saved lists.</li>
                    </ul>
                </section>

                {/* Section 6 */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 border border-white/10">
                            <Mail size={20} />
                        </div>
                        <h2 className="text-xl font-bold">6. Contact Information</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300">
                        If you have any questions, feedback, or data requests regarding this Privacy Policy, please contact our team:
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
                    <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
                    <Link to="/" className="hover:text-zinc-300 transition-colors">Home</Link>
                    <Link to="/login" className="hover:text-zinc-300 transition-colors">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
