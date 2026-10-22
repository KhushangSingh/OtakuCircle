import { Link } from 'react-router-dom';
import { Shield, FileText, Mail, Heart, Sparkles, Film } from './icons';

const Footer = () => {
    return (
        <footer className="border-t border-white/5 bg-[#080808] text-zinc-400 relative z-20">
            <div className="max-w-7xl mx-auto px-6 py-14">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                    
                    {/* Brand Column */}
                    <div className="md:col-span-2 space-y-4">
                        <Link to="/" className="inline-block">
                            <span 
                                className="text-3xl font-extrabold tracking-tighter text-white"
                                style={{
                                    background: 'linear-gradient(to bottom, #ffffff, #e4e4e7)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                OtakuCircle
                            </span>
                        </Link>
                        <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                            Your ultimate anime &amp; cinema sanctuary. Track watchlists, discover hidden gems with AI-powered similarity, and connect with fellow enthusiasts.
                        </p>
                    </div>

                    {/* Discovery Links */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Explore</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-white transition-colors">Anime Catalog</Link></li>
                            <li><Link to="/smart-search" className="hover:text-white transition-colors flex items-center gap-1.5"><Sparkles size={14} className="text-blue-400" /> Smart Search</Link></li>
                            <li><Link to="/movies" className="hover:text-white transition-colors flex items-center gap-1.5"><Film size={14} /> Movies &amp; TV</Link></li>
                            <li><Link to="/login" className="hover:text-white transition-colors">Sign In / Register</Link></li>
                        </ul>
                    </div>

                    {/* Legal & Compliance */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Trust &amp; Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/privacy" className="hover:text-white transition-colors flex items-center gap-1.5">
                                    <Shield size={14} className="text-blue-400" /> Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-white transition-colors flex items-center gap-1.5">
                                    <FileText size={14} className="text-zinc-400" /> Terms of Service
                                </Link>
                            </li>
                            <li className="pt-2 text-xs text-zinc-500">
                                Support &amp; Contact:
                                <a href="mailto:otakucircle.official@gmail.com" className="block text-zinc-300 hover:text-white transition-colors mt-0.5">
                                    otakucircle.official@gmail.com
                                </a>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
                    <p>&copy; {new Date().getFullYear()} OtakuCircle. Built for anime &amp; movie fans worldwide.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
                        <Link to="/login" className="hover:text-zinc-300 transition-colors">Account</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
