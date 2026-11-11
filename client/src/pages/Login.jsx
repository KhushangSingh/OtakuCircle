import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader, X, KeyRound, ShieldCheck, LinkIcon } from '../components/icons';
import { GoogleLogin } from '@react-oauth/google';
import heroImage from '../assets/spotlight-hero-bg-converted.webp';
import { setAuth } from '../utils/auth';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    // Registration steps: 'form' | 'otp'
    const [regStep, setRegStep] = useState('form');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: ''
    });
    const [regOtp, setRegOtp] = useState('');
    const [error, setError] = useState('');
    const [linkSent, setLinkSent] = useState(false); // true when backend sends a password-link email
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Track origin page so user can exit back to exactly where they came from
    useEffect(() => {
        if (location.state?.from && location.state.from !== '/login') {
            sessionStorage.setItem('login_return_path', location.state.from);
        }
    }, [location]);

    const handleBack = () => {
        const returnPath = location.state?.from || sessionStorage.getItem('login_return_path');
        if (returnPath && returnPath !== '/login') {
            navigate(returnPath);
        } else if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // =============================================
    // FORGOT PASSWORD STATE
    // =============================================
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=new password
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Fix auto-fill: clear password when switching modes, keep email
    const toggleMode = () => {
        setIsLogin(!isLogin);
        setRegStep('form');
        setError('');
        setLinkSent(false);
        setRegOtp('');
        setFormData(prev => ({
            username: '',
            email: prev.email,
            password: '',
            passwordConfirm: ''
        }));
    };

    // =============================================
    // LOGIN
    // =============================================
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLinkSent(false);
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                email: formData.email,
                password: formData.password
            });

            // Backend detected a Google-only account — email sent for safe password linking
            if (res.data.action === 'link_required') {
                setLinkSent(true);
                setLoading(false);
                return;
            }

            setAuth(res.data.token, res.data.username, { userId: res.data._id });
            sessionStorage.removeItem('otaku_home_scroll');
            window.location.href = '/';
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // =============================================
    // GOOGLE SIGN-IN / SIGN-UP
    // =============================================
    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/google`, {
                token: credentialResponse.credential
            });
            setAuth(res.data.token, res.data.username, { userId: res.data._id });
            sessionStorage.removeItem('otaku_home_scroll');
            window.location.href = '/';
        } catch (err) {
            setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // =============================================
    // REGISTRATION — Step 1: Send OTP
    // =============================================
    const handleSendRegOtp = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.passwordConfirm) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await axios.post(`${API_URL}/auth/send-otp`, { email: formData.email });
            setRegStep('otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    // =============================================
    // REGISTRATION — Step 2: Verify OTP & Create Account
    // =============================================
    const handleRegisterVerify = async (e) => {
        e.preventDefault();
        if (!regOtp || regOtp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/register-verify`, {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                otp: regOtp
            });
            setAuth(res.data.token, res.data.username, { userId: res.data._id });
            sessionStorage.removeItem('otaku_home_scroll');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // =============================================
    // FORGOT PASSWORD HANDLERS
    // =============================================
    const openForgotModal = () => {
        setShowForgotModal(true);
        setForgotStep(1);
        setForgotEmail(formData.email || '');
        setOtp('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setForgotError('');
        setForgotSuccess('');
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotError('');
        setForgotSuccess('');
    };

    const handleSendOtp = async () => {
        if (!forgotEmail) { setForgotError('Please enter your email'); return; }
        setForgotLoading(true);
        setForgotError('');
        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { email: forgotEmail });
            setForgotStep(2);
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) { setForgotError('Please enter the 6-digit OTP'); return; }
        setForgotLoading(true);
        setForgotError('');
        try {
            await axios.post(`${API_URL}/auth/verify-otp`, { email: forgotEmail, otp });
            setForgotStep(3);
        } catch (err) {
            setForgotError(err.response?.data?.message || 'OTP verification failed');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) { setForgotError('Password must be at least 6 characters'); return; }
        if (newPassword !== newPasswordConfirm) { setForgotError('Passwords do not match'); return; }
        setForgotLoading(true);
        setForgotError('');
        try {
            const res = await axios.post(`${API_URL}/auth/reset-password`, { email: forgotEmail, password: newPassword });
            setForgotSuccess(res.data.message);
            setTimeout(() => {
                closeForgotModal();
                setIsLogin(true);
                setFormData(prev => ({ ...prev, email: forgotEmail, password: '' }));
            }, 2000);
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Password reset failed');
        } finally {
            setForgotLoading(false);
        }
    };

    // =============================================
    // SHARED INPUT STYLES (Strict OS-DS Tokens)
    // =============================================
    const inputClass = "block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all";
    const labelClass = "text-xs font-semibold text-zinc-200 uppercase tracking-wider pl-1";

    // =============================================
    // RENDER
    // =============================================
    return (
        <div className="h-screen w-full bg-[#0d0d0d] flex relative overflow-hidden font-sans text-white">
            
            {/* FLOATING BACK BUTTON */}
            <button
                type="button"
                onClick={handleBack}
                className="absolute top-6 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs sm:text-sm font-semibold backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
                <ArrowLeft size={16} />
                <span>Back</span>
            </button>

            {/* FULL PAGE BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[#0d0d0d]">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 blur-lg scale-105"
                    style={{ backgroundImage: `url(${heroImage})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#000000] from-0% via-[#000000]/95 via-[35%] to-transparent to-[70%]"></div>
            </div>

            {/* LEFT SIDE: VISUALS (Enlarged pure-white hero styling without blur or hover animation, positioned higher) */}
            <div className="hidden lg:flex lg:w-1/2 relative items-start justify-center pt-20 xl:pt-24 overflow-hidden h-full z-10">
                <div className="relative px-12 max-w-2xl flex flex-col items-start">
                    <div className="mb-0.5 select-none">
                        <img 
                            src="/logo.png" 
                            alt="OtakuCircle Logo" 
                            className="w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 object-contain" 
                        />
                    </div>
                    <h1 
                        className="text-6xl sm:text-7xl lg:text-8xl xl:text-[7rem] leading-none font-extrabold tracking-tight mb-4 text-white select-none drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] inline-block pr-8 pb-1"
                        style={{
                            background: 'linear-gradient(to bottom, #ffffff, #e4e4e7)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))'
                        }}
                    >
                        OtakuCircle
                    </h1>
                    <p className="text-2xl lg:text-3xl text-zinc-300 font-light leading-relaxed drop-shadow-md">
                        Your ultimate anime &amp; movie sanctuary. <br/><span className="text-white font-semibold">Track</span> progress, <span className="text-white font-semibold">discover</span> hidden gems, and <span className="text-white font-semibold">connect</span> with a community that gets it.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: GLASSMORPHISM CARD (Taller Zero-Scroll OS-DS Design with balanced lower placement) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10 h-full overflow-y-auto lg:overflow-hidden font-sans">
                <div className="relative rounded-[2rem] border border-white/20 bg-white/10 px-7 py-6 sm:px-9 sm:py-7 shadow-2xl shadow-black/35 backdrop-blur-2xl backdrop-saturate-150 w-full max-w-[460px] min-h-[500px] sm:min-h-[530px] flex flex-col justify-between transition-all">
                    
                    {/* Header with Segmented Mode Toggle (No logo or brand name) */}
                    <div className="flex justify-between items-center mb-5 sm:mb-6">
                        <div className="inline-flex p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => { if (!isLogin) toggleMode(); }}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    isLogin ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (isLogin) toggleMode(); }}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    !isLogin ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Register
                            </button>
                        </div>

                        <span className="text-sm font-semibold text-zinc-100 tracking-wide">
                            {isLogin ? 'Welcome back' : 'New account'}
                        </span>
                    </div>

                    {/* Lower Container: Title, Inputs & Actions (fills the card and covers the lower empty space) */}
                    <div className="flex-1 flex flex-col justify-between pt-2 sm:pt-3">
                        <div>
                            {/* Title and Google Auth Row (shifted lower) */}
                            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pt-1.5 sm:pt-2">
                                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                    {isLogin ? 'Log in' : regStep === 'otp' ? 'Verify' : 'Sign up'}
                                </h2>
                                {(isLogin || (!isLogin && regStep === 'form')) && (
                                    <div className="shrink-0 flex items-center">
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setError('Google sign-in failed')}
                                            shape="pill"
                                            size="medium"
                                            text="signin_with"
                                            theme="outline"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Alerts & Notifications */}
                            {error && (
                                <div className="mb-4 p-3 px-4 bg-red-500/15 border border-red-500/25 rounded-2xl text-red-300 text-xs sm:text-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                    <span className="truncate">{error}</span>
                                </div>
                            )}

                            {linkSent && (
                                <div className="mb-4 p-3.5 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-200 text-xs sm:text-sm space-y-1">
                                    <div className="flex items-center gap-1.5 font-semibold">
                                        <LinkIcon size={16} className="shrink-0" />
                                        Verification email sent
                                    </div>
                                    <p className="text-white/80 leading-snug">
                                        Check <span className="font-semibold text-white">{formData.email}</span> to set your password.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ===== LOGIN FORM ===== */}
                        {isLogin && (
                            <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-between font-sans mt-1" autoComplete="off">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            autoComplete="email"
                                            placeholder="e-mail address"
                                            className="w-full rounded-full border border-white/10 bg-white/[0.08] py-3.5 sm:py-4 pl-12 pr-4 text-sm sm:text-base text-white placeholder-white/50 shadow-inner outline-none transition-all focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 focus:border-white/30"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="relative flex items-center">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                autoComplete="current-password"
                                                placeholder="password"
                                                className="w-full rounded-full border border-white/10 bg-white/[0.08] py-3.5 sm:py-4 pl-12 pr-4 text-sm sm:text-base text-white placeholder-white/50 shadow-inner outline-none transition-all focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 focus:border-white/30"
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end pr-2 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={openForgotModal}
                                                className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors cursor-pointer font-medium"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Privacy line & Submit button (positioned higher) */}
                                <div className="flex items-center justify-between pt-4 pb-2 sm:pb-3 mt-auto">
                                    <p className="text-[11px] leading-relaxed text-white/50 max-w-[210px]">
                                        By signing in, you agree to our{' '}
                                        <Link to="/terms" state={{ from: '/login' }} onClick={() => sessionStorage.setItem('legal_return_path', '/login')} className="underline hover:text-white transition-colors">Terms of Service</Link> and{' '}
                                        <Link to="/privacy" state={{ from: '/login' }} onClick={() => sessionStorage.setItem('legal_return_path', '/login')} className="underline hover:text-white transition-colors">Privacy Policy</Link>.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex h-12 px-6 sm:px-7 items-center justify-center rounded-full bg-white text-black font-bold text-sm sm:text-base shadow-lg transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                    >
                                        {loading ? <Loader className="animate-spin text-black" size={18} /> : <span>Submit</span>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ===== REGISTER FORM — Step 1: Details (Side-by-side passwords, Zero Scroll) ===== */}
                        {!isLogin && regStep === 'form' && (
                            <form onSubmit={handleSendRegOtp} className="flex-1 flex flex-col justify-between font-sans mt-1" autoComplete="off">
                                <div className="space-y-3.5">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            autoComplete="off"
                                            placeholder="username"
                                            className="w-full rounded-full border border-white/10 bg-white/[0.08] py-3.5 sm:py-4 pl-12 pr-4 text-sm sm:text-base text-white placeholder-white/50 shadow-inner outline-none transition-all focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 focus:border-white/30"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            autoComplete="email"
                                            placeholder="e-mail address"
                                            className="w-full rounded-full border border-white/10 bg-white/[0.08] py-3.5 sm:py-4 pl-12 pr-4 text-sm sm:text-base text-white placeholder-white/50 shadow-inner outline-none transition-all focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 focus:border-white/30"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/50">
                                                <Lock size={16} />
                                            </div>
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                autoComplete="new-password"
                                                placeholder="password"
                                                className="w-full rounded-full border border-white/10 bg-white/[0.08] py-3.5 pl-10 pr-3 text-xs sm:text-sm text-white placeholder-white/50 shadow-inner outline-none transition-all focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 focus:border-white/30"
                                                required
                                            />
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/50">
                                                <Lock size={16} />
                                            </div>
                                            <input
                                                type="password"
                                                name="passwordConfirm"
                                                value={formData.passwordConfirm}
                                                onChange={handleChange}
                                                autoComplete="new-password"
                                                placeholder="confirm"
                                                className="w-full rounded-full border border-white/10 bg-white/[0.08] py-3.5 pl-10 pr-3 text-xs sm:text-sm text-white placeholder-white/50 shadow-inner outline-none transition-all focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 focus:border-white/30"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Privacy line & Submit button (positioned higher) */}
                                <div className="flex items-center justify-between pt-4 pb-2 sm:pb-3 mt-auto">
                                    <p className="text-[11px] leading-relaxed text-white/50 max-w-[210px]">
                                        By creating an account, you agree to our{' '}
                                        <Link to="/terms" state={{ from: '/login' }} onClick={() => sessionStorage.setItem('legal_return_path', '/login')} className="underline hover:text-white transition-colors">Terms of Service</Link> and{' '}
                                        <Link to="/privacy" state={{ from: '/login' }} onClick={() => sessionStorage.setItem('legal_return_path', '/login')} className="underline hover:text-white transition-colors">Privacy Policy</Link>.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex h-12 px-6 sm:px-7 items-center justify-center rounded-full bg-white text-black font-bold text-sm sm:text-base shadow-lg transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                    >
                                        {loading ? <Loader className="animate-spin text-black" size={18} /> : <span>Submit</span>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ===== REGISTER — Step 2: Enter OTP ===== */}
                        {!isLogin && regStep === 'otp' && (
                            <form onSubmit={handleRegisterVerify} className="flex-1 flex flex-col justify-between font-sans mt-1">
                                <div className="space-y-4 pt-2">
                                    <p className="text-xs sm:text-sm text-white/70 text-center">
                                        We sent a 6-digit code to <span className="text-white font-medium">{formData.email}</span>
                                    </p>
                                    <input
                                        type="text"
                                        value={regOtp}
                                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full text-center text-2xl sm:text-3xl font-bold tracking-[0.4em] rounded-full border border-white/10 bg-white/[0.08] py-3.5 text-white placeholder-white/30 outline-none focus:bg-white/[0.15] focus:ring-2 focus:ring-white/20 transition-all"
                                        placeholder="000000"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-4 pb-2 sm:pb-3 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => { setRegStep('form'); setError(''); setRegOtp(''); }}
                                        className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors cursor-pointer font-medium"
                                    >
                                        Wrong email? Go back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex h-12 px-6 sm:px-7 items-center justify-center rounded-full bg-white text-black font-bold text-sm sm:text-base shadow-lg transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                    >
                                        {loading ? <Loader className="animate-spin text-black" size={18} /> : <span>Submit</span>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* =============================================
                FORGOT PASSWORD MODAL (Glasio Liquid Glass Standard)
            ============================================= */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#121212]/90 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 rounded-[2rem] w-full max-w-md p-8 sm:p-10 relative shadow-2xl shadow-black/60">
                        <button onClick={closeForgotModal}
                            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                            <X size={20} />
                        </button>

                        {/* Step indicators */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                        forgotStep >= step ? 'bg-white text-black shadow-md' : 'bg-white/5 text-zinc-600 border border-white/5'
                                    }`}>{step}</div>
                                    {step < 3 && <div className={`w-8 h-0.5 ${forgotStep > step ? 'bg-white' : 'bg-white/10'}`} />}
                                </div>
                            ))}
                        </div>

                        {forgotError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                {forgotError}
                            </div>
                        )}
                        {forgotSuccess && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm mb-4 flex items-center gap-2">
                                <ShieldCheck size={16} className="shrink-0" />
                                {forgotSuccess}
                            </div>
                        )}

                        {/* STEP 1: Enter email */}
                        {forgotStep === 1 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <Mail size={36} className="mx-auto text-blue-400 mb-3" />
                                    <h3 className="text-xl font-bold text-white">Forgot Password?</h3>
                                    <p className="text-zinc-400 text-sm mt-1">Enter your email and we'll send you a verification code</p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                                        className={inputClass} placeholder="name@example.com" autoFocus />
                                </div>
                                <button onClick={handleSendOtp} disabled={forgotLoading}
                                    className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                    {forgotLoading ? <Loader className="animate-spin" size={18} /> : <><span>Send Code</span><ArrowRight size={16} /></>}
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Enter OTP */}
                        {forgotStep === 2 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <KeyRound size={36} className="mx-auto text-blue-400 mb-3" />
                                    <h3 className="text-xl font-bold text-white">Enter Verification Code</h3>
                                    <p className="text-zinc-400 text-sm mt-1">
                                        We sent a 6-digit code to <span className="text-zinc-200 font-medium">{forgotEmail}</span>
                                    </p>
                                </div>
                                <input type="text" value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="block w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-3xl font-bold tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                    placeholder="000000" maxLength={6} autoFocus />
                                <button onClick={handleVerifyOtp} disabled={forgotLoading}
                                    className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                    {forgotLoading ? <Loader className="animate-spin" size={18} /> : <><span>Verify Code</span><ArrowRight size={16} /></>}
                                </button>
                                <button onClick={() => { setForgotStep(1); setForgotError(''); setOtp(''); }}
                                    className="w-full text-zinc-400 hover:text-white text-sm transition-colors">
                                    Didn't receive it? Go back
                                </button>
                            </div>
                        )}

                        {/* STEP 3: Set new password */}
                        {forgotStep === 3 && !forgotSuccess && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <ShieldCheck size={36} className="mx-auto text-emerald-400 mb-3" />
                                    <h3 className="text-xl font-bold text-white">Set New Password</h3>
                                    <p className="text-zinc-400 text-sm mt-1">Choose a strong password for your account</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                            className={inputClass} placeholder="New password" autoFocus />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                            className={inputClass} placeholder="Confirm new password" />
                                    </div>
                                </div>
                                <button onClick={handleResetPassword} disabled={forgotLoading}
                                    className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                    {forgotLoading ? <Loader className="animate-spin" size={18} /> : <><span>Save New Password</span><ShieldCheck size={16} /></>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
