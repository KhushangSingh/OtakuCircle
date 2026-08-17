import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader, X, KeyRound, ShieldCheck } from 'lucide-react';
import heroImage from '../assets/spotlight-hero-bg.jpg';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: ''
    });
    const [error, setError] = useState('');
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
        setError('');
        setFormData(prev => ({
            username: '',
            email: prev.email, // keep email
            password: '',       // clear password
            passwordConfirm: '' // clear confirm
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // LOGIN
                const res = await axios.post(`${API_URL}/auth/login`, {
                    email: formData.email,
                    password: formData.password
                });
                
                // Store Auth Data
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('userId', res.data._id);
                localStorage.setItem('username', res.data.username);
                
                // FIX: Clear any saved scroll position so user lands on Hero section
                sessionStorage.removeItem('otaku_home_scroll');
                
                // Redirect
                window.location.href = '/'; 
            } else {
                // REGISTER
                if (formData.password !== formData.passwordConfirm) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                const res = await axios.post(`${API_URL}/auth/register`, {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                });

                // Store Auth Data
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('userId', res.data._id);
                localStorage.setItem('username', res.data.username);

                // FIX: Clear scroll position
                sessionStorage.removeItem('otaku_home_scroll');

                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
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
        setForgotEmail(formData.email || ''); // pre-fill from login form
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
        if (!forgotEmail) {
            setForgotError('Please enter your email');
            return;
        }
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
        if (!otp || otp.length !== 6) {
            setForgotError('Please enter the 6-digit OTP');
            return;
        }
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
        if (!newPassword || newPassword.length < 6) {
            setForgotError('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            setForgotError('Passwords do not match');
            return;
        }
        setForgotLoading(true);
        setForgotError('');
        try {
            const res = await axios.post(`${API_URL}/auth/reset-password`, { 
                email: forgotEmail, 
                password: newPassword 
            });
            setForgotSuccess(res.data.message);
            // After 2 seconds, close modal and go back to login
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
    // RENDER
    // =============================================
    return (
        <div className="h-screen w-full bg-[#0d0d0d] flex relative overflow-hidden font-sans text-white">
            
            {/* FULL PAGE BACKGROUND WITH GRADIENT FADE */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[#0d0d0d]">
                {/* The background image: blurred and 50% opacity */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 blur-2xl scale-110"
                    style={{ backgroundImage: `url(${heroImage})` }}
                ></div>
                {/* Gradient overlay: Left side is solid black, transitioning to transparent on the right */}
                <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent"></div>
            </div>

            {/* LEFT SIDE: VISUALS */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden h-full z-10">
                <div className="relative p-12 max-w-lg">
                    <h1 className="text-6xl font-extrabold tracking-tighter mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                        OtakuCircle
                    </h1>
                    <p className="text-xl text-zinc-300 font-light leading-relaxed drop-shadow-md">
                        Your personal anime sanctuary. Track progress, discover hidden gems, and connect with a community that gets it.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10 h-full">
                <div className="w-full max-w-md space-y-8">
                    
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {isLogin ? 'Welcome back' : 'Create an account'}
                        </h2>
                        <p className="text-zinc-500">
                            {isLogin ? 'Enter your details to access your lists.' : 'Start your journey with us today.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        autoComplete="off"
                                        className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
                                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            {/* Forgot Password Link — only visible in login mode */}
                            {isLogin && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={openForgotModal}
                                        className="text-xs text-zinc-500 hover:text-blue-400 transition-colors mt-1"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}
                        </div>

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        name="passwordConfirm"
                                        value={formData.passwordConfirm}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? <Loader className="animate-spin" size={20} /> : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-4">
                        <p className="text-zinc-500 text-sm">
                            {isLogin ? "Don't have an account?" : 'Already have an account?'}
                            <button
                                onClick={toggleMode}
                                className="ml-2 text-white font-semibold hover:text-blue-400 transition-colors"
                            >
                                {isLogin ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* =============================================
                FORGOT PASSWORD MODAL
            ============================================= */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-200">
                        {/* Close button */}
                        <button
                            onClick={closeForgotModal}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Step indicators */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                        forgotStep >= step 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-white/5 text-zinc-600'
                                    }`}>
                                        {step}
                                    </div>
                                    {step < 3 && (
                                        <div className={`w-8 h-0.5 ${forgotStep > step ? 'bg-blue-500' : 'bg-white/10'}`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Error / Success messages */}
                        {forgotError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                {forgotError}
                            </div>
                        )}
                        {forgotSuccess && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm mb-4 flex items-center gap-2">
                                <ShieldCheck size={16} className="shrink-0" />
                                {forgotSuccess}
                            </div>
                        )}

                        {/* STEP 1: Enter email */}
                        {forgotStep === 1 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <Mail size={36} className="mx-auto text-blue-400 mb-3" />
                                    <h3 className="text-xl font-bold">Forgot Password?</h3>
                                    <p className="text-zinc-500 text-sm mt-1">Enter your email and we'll send you a verification code</p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        placeholder="name@example.com"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={handleSendOtp}
                                    disabled={forgotLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    {forgotLoading ? <Loader className="animate-spin" size={18} /> : (
                                        <>Send OTP <ArrowRight size={16} /></>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Enter OTP */}
                        {forgotStep === 2 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <KeyRound size={36} className="mx-auto text-blue-400 mb-3" />
                                    <h3 className="text-xl font-bold">Enter Verification Code</h3>
                                    <p className="text-zinc-500 text-sm mt-1">
                                        We sent a 6-digit code to <span className="text-zinc-300">{forgotEmail}</span>
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="block w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-3xl font-bold tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                />
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={forgotLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    {forgotLoading ? <Loader className="animate-spin" size={18} /> : (
                                        <>Verify OTP <ArrowRight size={16} /></>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setForgotStep(1); setForgotError(''); setOtp(''); }}
                                    className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                                >
                                    Didn't receive it? Go back
                                </button>
                            </div>
                        )}

                        {/* STEP 3: Set new password */}
                        {forgotStep === 3 && !forgotSuccess && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <ShieldCheck size={36} className="mx-auto text-green-400 mb-3" />
                                    <h3 className="text-xl font-bold">Set New Password</h3>
                                    <p className="text-zinc-500 text-sm mt-1">Choose a strong password for your account</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="New password"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            value={newPasswordConfirm}
                                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleResetPassword}
                                    disabled={forgotLoading}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    {forgotLoading ? <Loader className="animate-spin" size={18} /> : (
                                        <>Save New Password <ShieldCheck size={16} /></>
                                    )}
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