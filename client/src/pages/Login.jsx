import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader, X, KeyRound, ShieldCheck, LinkIcon } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import heroImage from '../assets/spotlight-hero-bg.jpg';

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

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userId', res.data._id);
            localStorage.setItem('username', res.data.username);
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
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userId', res.data._id);
            localStorage.setItem('username', res.data.username);
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
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userId', res.data._id);
            localStorage.setItem('username', res.data.username);
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
            
            {/* FULL PAGE BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[#0d0d0d]">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 blur-lg scale-105"
                    style={{ backgroundImage: `url(${heroImage})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#000000] from-0% via-[#000000]/95 via-[35%] to-transparent to-[70%]"></div>
            </div>

            {/* LEFT SIDE: VISUALS (Enlarged pure-white hero styling) */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden h-full z-10">
                <div className="relative p-12 max-w-2xl">
                    <h1 
                        className="text-6xl sm:text-7xl lg:text-8xl xl:text-[7rem] leading-none font-extrabold tracking-tight mb-8 text-white select-none drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] inline-block pr-8 pb-3"
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

            {/* RIGHT SIDE: FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10 h-full overflow-y-auto">
                <div className="w-full max-w-md space-y-6 py-8">
                    
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {isLogin ? 'Welcome back' : regStep === 'otp' ? 'Verify your email' : 'Create an account'}
                        </h2>
                        <p className="text-zinc-300 text-sm">
                            {isLogin ? 'Enter your details to access your lists.' 
                             : regStep === 'otp' ? `We sent a code to ${formData.email}` 
                             : 'Start your journey with us today.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Link-required info banner — shown when Google account tries email/password login */}
                    {linkSent && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-indigo-200">
                                <LinkIcon size={16} className="shrink-0" />
                                Verification email sent
                            </div>
                            <p className="text-zinc-300 leading-relaxed">
                                This email is linked to a Google account. We've sent a verification link to{' '}
                                <span className="font-semibold text-white">{formData.email}</span>.
                            </p>
                            <p className="text-zinc-400">
                                Click the button in that email to set a password — after that you can sign in with either Google or email &amp; password.
                            </p>
                        </div>
                    )}

                    {/* ===== GOOGLE BUTTON (Solid White Pill) ===== */}
                    {(isLogin || (!isLogin && regStep === 'form')) && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google sign-in failed')}
                                    shape="pill"
                                    width="384"
                                    text={isLogin ? 'signin_with' : 'signup_with'}
                                    theme="outline"
                                />
                            </div>
                            <div className="relative flex items-center">
                                <div className="flex-grow border-t border-white/10"></div>
                                <span className="flex-shrink-0 mx-4 text-zinc-300 text-xs font-bold uppercase tracking-widest">or</span>
                                <div className="flex-grow border-t border-white/10"></div>
                            </div>
                        </div>
                    )}

                    {/* ===== LOGIN FORM ===== */}
                    {isLogin && (
                        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                            <div className="space-y-1.5">
                                <label className={labelClass}>Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                                        autoComplete="email" className={inputClass} placeholder="name@example.com" required />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input type="password" name="password" value={formData.password} onChange={handleChange}
                                        autoComplete="current-password" className={inputClass} placeholder="••••••••" required />
                                </div>
                                <div className="flex justify-end">
                                    <button type="button" onClick={openForgotModal}
                                        className="text-xs text-zinc-300 hover:text-white transition-colors font-medium mt-1 drop-shadow-sm">
                                        Forgot password?
                                    </button>
                                </div>
                            </div>

                            {/* OS-DS Primary Solid White CTA */}
                            <button type="submit" disabled={loading}
                                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                {loading ? <Loader className="animate-spin" size={20} /> : <><span>Sign In</span><ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}

                    {/* ===== REGISTER FORM — Step 1: Details ===== */}
                    {!isLogin && regStep === 'form' && (
                        <form onSubmit={handleSendRegOtp} className="space-y-4" autoComplete="off">
                            <div className="space-y-1.5">
                                <label className={labelClass}>Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input type="text" name="username" value={formData.username} onChange={handleChange}
                                        autoComplete="off" className={inputClass} placeholder="johndoe" required />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                                        autoComplete="email" className={inputClass} placeholder="name@example.com" required />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input type="password" name="password" value={formData.password} onChange={handleChange}
                                        autoComplete="new-password" className={inputClass} placeholder="••••••••" required />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-white transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange}
                                        autoComplete="new-password" className={inputClass} placeholder="••••••••" required />
                                </div>
                            </div>

                            {/* OS-DS Primary Solid White CTA */}
                            <button type="submit" disabled={loading}
                                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                {loading ? <Loader className="animate-spin" size={20} /> : <><span>Send Verification Code</span><ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}

                    {/* ===== REGISTER — Step 2: Enter OTP ===== */}
                    {!isLogin && regStep === 'otp' && (
                        <form onSubmit={handleRegisterVerify} className="space-y-5">
                            <div className="flex items-center justify-center mb-2">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                                    <Mail size={28} className="text-blue-400" />
                                </div>
                            </div>
                            <input
                                type="text"
                                value={regOtp}
                                onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="block w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-3xl font-bold tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                placeholder="000000"
                                maxLength={6}
                                autoFocus
                            />
                            {/* OS-DS Primary Solid White CTA */}
                            <button type="submit" disabled={loading}
                                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                {loading ? <Loader className="animate-spin" size={20} /> : <><span>Verify &amp; Create Account</span><ShieldCheck size={18} /></>}
                            </button>
                            <button type="button" onClick={() => { setRegStep('form'); setError(''); setRegOtp(''); }}
                                className="w-full text-zinc-300 hover:text-white text-sm transition-colors font-medium">
                                Wrong email? Go back
                            </button>
                        </form>
                    )}

                    <div className="text-center pt-2 space-y-4">
                        <p className="text-zinc-200 text-sm font-medium drop-shadow-sm">
                            {isLogin ? "Don't have an account?" : 'Already have an account?'}
                            <button onClick={toggleMode}
                                className="ml-2 text-white font-bold hover:text-blue-400 transition-colors">
                                {isLogin ? 'Sign up' : 'Log in'}
                            </button>
                        </p>

                        <div className="flex items-center justify-center gap-3 text-xs text-zinc-300 font-medium pt-3 border-t border-white/10 drop-shadow-sm">
                            <Link to="/privacy" className="hover:text-white transition-colors underline-offset-2 hover:underline">Privacy Policy</Link>
                            <span className="text-zinc-500">•</span>
                            <Link to="/terms" className="hover:text-white transition-colors underline-offset-2 hover:underline">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* =============================================
                FORGOT PASSWORD MODAL (OS-DS Level 3 Elevation)
            ============================================= */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
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
