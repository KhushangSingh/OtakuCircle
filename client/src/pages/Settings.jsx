import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Settings as SettingsIcon, User, Mail, Lock, ShieldAlert, Bell, KeyRound } from 'lucide-react';

// ── Pill toggle ──────────────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            checked ? 'bg-indigo-500' : 'bg-zinc-700'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
        }`} />
    </button>
);

// ── OTP digit input (mirrors Login.jsx style) ─────────────────────────────────
const OtpInput = ({ value, onChange }) => (
    <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="block w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-bold tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
        placeholder="000000"
        maxLength={6}
        autoFocus
    />
);

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white text-sm font-medium focus:border-blue-500 focus:bg-black/60 outline-none transition-all placeholder-zinc-600";

// ── Shared primary / secondary button styles ──────────────────────────────────
const btnPrimary = "px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-colors";
const btnSecondary = "px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-xl font-bold text-zinc-300 transition-colors";

// ─────────────────────────────────────────────────────────────────────────────

const Settings = () => {
    const navigate = useNavigate();

    // ── Core state ────────────────────────────────────────────────────────────
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // ── Username ──────────────────────────────────────────────────────────────
    const [usernameData, setUsernameData] = useState('');

    // ── Password ──────────────────────────────────────────────────────────────
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

    // ── Email change (2-step) ─────────────────────────────────────────────────
    const [emailStep, setEmailStep] = useState(1); // 1 = form, 2 = OTP
    const [emailData, setEmailData] = useState({ new: '', currentPassword: '', otp: '' });
    const [emailLoading, setEmailLoading] = useState(false);

    // ── Account deletion (3-step modal) ───────────────────────────────────────
    const [deleteStep, setDeleteStep] = useState(0); // 0=closed, 1=confirm, 2=OTP
    const [deleteOtp, setDeleteOtp] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ── Email preferences ─────────────────────────────────────────────────────
    const [emailPrefs, setEmailPrefs] = useState({
        friendRecommendation: true,
        friendRequest: true,
        friendRequestAccepted: true,
        platformUpdates: true,
    });

    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // ── Data fetching ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchUserData = async () => {
            if (!token || !username) { navigate('/login'); return; }
            try {
                const userRes = await axios.get(`${API_URL}/users/${username}`);
                setUser(userRes.data);
                setUsernameData(userRes.data.username);
                setEmailPrefs(userRes.data.emailPreferences || {
                    friendRecommendation: true,
                    friendRequest: true,
                    friendRequestAccepted: true,
                    platformUpdates: true,
                });
            } catch (error) {
                console.error('Error fetching user data:', error);
                setMessage({ type: 'error', text: 'Failed to load settings data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [username, token, API_URL, navigate]);

    // Auto-dismiss toast
    useEffect(() => {
        if (message.text) {
            const t = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return () => clearTimeout(t);
        }
    }, [message]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const toast = (type, text) => setMessage({ type, text });

    const cancelEdit = () => {
        setEditingField(null);
        setEmailStep(1);
        setEmailData({ new: '', currentPassword: '', otp: '' });
        setPasswordData({ current: '', new: '', confirm: '' });
        setUsernameData(user?.username ?? '');
    };

    // ── Username handler ──────────────────────────────────────────────────────
    const handleUsernameChange = async (e) => {
        e.preventDefault();
        if (usernameData === user.username) { setEditingField(null); return; }
        try {
            await axios.put(
                `${API_URL}/users/profile`,
                { username: usernameData },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            localStorage.setItem('username', usernameData);
            toast('success', 'Username updated');
            setEditingField(null);
            window.location.reload();
        } catch (error) {
            toast('error', error.response?.data?.message || 'Username taken');
        }
    };

    // ── Password handler ──────────────────────────────────────────────────────
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) { toast('error', 'Passwords do not match'); return; }
        try {
            await axios.put(
                `${API_URL}/users/password`,
                { currentPassword: passwordData.current, newPassword: passwordData.new },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast('success', 'Password updated');
            setEditingField(null);
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) {
            toast('error', error.response?.data?.message || 'Error updating password');
        }
    };

    // ── Email change: step 1 — send OTP ──────────────────────────────────────
    const handleEmailSendOtp = async (e) => {
        e.preventDefault();
        setEmailLoading(true);
        try {
            await axios.post(
                `${API_URL}/users/email/send-otp`,
                { newEmail: emailData.new, currentPassword: emailData.currentPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast('success', `Code sent to ${emailData.new}`);
            setEmailStep(2);
        } catch (error) {
            toast('error', error.response?.data?.message || 'Failed to send verification code');
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Email change: step 2 — confirm OTP ───────────────────────────────────
    const handleEmailConfirm = async (e) => {
        e.preventDefault();
        setEmailLoading(true);
        try {
            await axios.put(
                `${API_URL}/users/email`,
                { newEmail: emailData.new, currentPassword: emailData.currentPassword, otp: emailData.otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUser(prev => ({ ...prev, email: emailData.new }));
            toast('success', 'Email updated successfully');
            setEditingField(null);
            setEmailStep(1);
            setEmailData({ new: '', currentPassword: '', otp: '' });
        } catch (error) {
            toast('error', error.response?.data?.message || 'Invalid or expired code');
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Delete: step 1 — send OTP ─────────────────────────────────────────────
    const handleDeleteSendOtp = async () => {
        setDeleteLoading(true);
        try {
            await axios.post(
                `${API_URL}/users/delete/send-otp`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDeleteStep(2);
        } catch (error) {
            toast('error', error.response?.data?.message || 'Failed to send verification code');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Delete: step 2 — confirm OTP ─────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        setDeleteLoading(true);
        try {
            await axios.delete(
                `${API_URL}/users/profile`,
                {
                    data: { otp: deleteOtp },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            localStorage.clear();
            navigate('/');
        } catch (error) {
            toast('error', error.response?.data?.message || 'Invalid or expired code');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Email preferences toggle ──────────────────────────────────────────────
    const handlePrefToggle = async (key, value) => {
        setEmailPrefs(prev => ({ ...prev, [key]: value })); // optimistic
        try {
            const res = await axios.put(
                `${API_URL}/users/email-preferences`,
                { [key]: value },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEmailPrefs(res.data.emailPreferences);
            toast('success', 'Preferences saved');
        } catch (err) {
            setEmailPrefs(prev => ({ ...prev, [key]: !value })); // revert
            toast('error', 'Failed to save preferences');
        }
    };

    // ── Loading / guard ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );
    if (!user) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-red-500 font-medium">
            Please login to view settings.
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-20 pt-24 px-4 lg:px-8 selection:bg-blue-500/30">

            {/* Toast */}
            {message.text && (
                <div className={`fixed top-20 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
                    message.type === 'success'
                        ? 'bg-[#0d0d0d] border-green-500/50 text-green-400'
                        : 'bg-[#0d0d0d] border-red-500/50 text-red-400'
                }`}>
                    <span className="font-semibold text-sm">{message.text}</span>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-4">

                {/* ── Account Settings card ─────────────────────────────── */}
                <div className="bg-[#151515] border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl space-y-4">
                    <h1 className="text-xl font-bold text-white flex items-center gap-3 border-b border-white/5 pb-4">
                        <SettingsIcon className="text-blue-500" size={20} /> Account Settings
                    </h1>

                    {/* Username */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">Username</label>
                        {editingField === 'username' ? (
                            <form onSubmit={handleUsernameChange} className="py-3 px-4 bg-[#1a1a1a] rounded-xl space-y-3">
                                <input
                                    type="text"
                                    value={usernameData}
                                    onChange={(e) => setUsernameData(e.target.value)}
                                    className={inputCls}
                                    required
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className={btnPrimary}>Save Changes</button>
                                    <button type="button" onClick={cancelEdit} className={btnSecondary}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between py-3 px-4 bg-[#1a1a1a] rounded-xl group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-white text-sm font-medium flex items-center gap-2">
                                    <User className="text-zinc-500" size={16} /> @{user.username}
                                </span>
                                <button
                                    onClick={() => setEditingField('username')}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">Email Address</label>
                        {editingField === 'email' ? (
                            <div className="py-3 px-4 bg-[#1a1a1a] rounded-xl space-y-3">
                                {/* Step 1: collect new email + password */}
                                {emailStep === 1 && (
                                    <form onSubmit={handleEmailSendOtp} className="space-y-3">
                                        <input
                                            type="email"
                                            value={emailData.new}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, new: e.target.value }))}
                                            placeholder="New email address"
                                            className={inputCls}
                                            required
                                        />
                                        <input
                                            type="password"
                                            value={emailData.currentPassword}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            placeholder="Current password"
                                            className={inputCls}
                                            required
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={emailLoading}
                                                className={`${btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {emailLoading ? 'Sending…' : 'Send Verification Code'}
                                            </button>
                                            <button type="button" onClick={cancelEdit} className={btnSecondary}>Cancel</button>
                                        </div>
                                    </form>
                                )}

                                {/* Step 2: enter OTP */}
                                {emailStep === 2 && (
                                    <form onSubmit={handleEmailConfirm} className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <KeyRound size={15} className="text-blue-400 shrink-0" />
                                            We sent a code to <span className="text-white font-medium">{emailData.new}</span>
                                        </div>
                                        <OtpInput
                                            value={emailData.otp}
                                            onChange={(v) => setEmailData(prev => ({ ...prev, otp: v }))}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={emailLoading || emailData.otp.length !== 6}
                                                className={`${btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {emailLoading ? 'Confirming…' : 'Confirm Change'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEmailStep(1)}
                                                className={btnSecondary}
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between py-3 px-4 bg-[#1a1a1a] rounded-xl group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-white text-sm font-medium flex items-center gap-2">
                                    <Mail className="text-zinc-500" size={16} /> {user.email}
                                </span>
                                <button
                                    onClick={() => setEditingField('email')}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">Password</label>
                        {editingField === 'password' ? (
                            <form onSubmit={handlePasswordChange} className="py-3 px-4 bg-[#1a1a1a] rounded-xl space-y-3">
                                <input
                                    type="password"
                                    value={passwordData.current}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                                    placeholder="Current password"
                                    className={inputCls}
                                    required
                                />
                                <input
                                    type="password"
                                    value={passwordData.new}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                                    placeholder="New password"
                                    className={inputCls}
                                    required
                                />
                                <input
                                    type="password"
                                    value={passwordData.confirm}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                                    placeholder="Confirm new password"
                                    className={inputCls}
                                    required
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className={btnPrimary}>Update Password</button>
                                    <button type="button" onClick={cancelEdit} className={btnSecondary}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between py-3 px-4 bg-[#1a1a1a] rounded-xl group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-white text-sm font-medium flex items-center gap-2">
                                    <Lock className="text-zinc-500" size={16} /> ••••••••
                                </span>
                                <button
                                    onClick={() => setEditingField('password')}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Email Preferences card ─────────────────────────────── */}
                <div className="bg-[#151515] border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl">
                    <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3 mb-3">
                        <Bell className="text-indigo-400" size={18} /> Email Preferences
                    </h2>

                    {/* Social Notifications */}
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Social Notifications</p>
                    <div className="space-y-0.5">
                        <div className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm text-white font-medium">Friend sends a recommendation</p>
                                <p className="text-xs text-zinc-500">When a friend recommends an anime or movie to you</p>
                            </div>
                            <ToggleSwitch
                                checked={emailPrefs.friendRecommendation}
                                onChange={(val) => handlePrefToggle('friendRecommendation', val)}
                            />
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm text-white font-medium">Friend request received</p>
                                <p className="text-xs text-zinc-500">When someone sends you a friend request</p>
                            </div>
                            <ToggleSwitch
                                checked={emailPrefs.friendRequest}
                                onChange={(val) => handlePrefToggle('friendRequest', val)}
                            />
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm text-white font-medium">Friend request accepted</p>
                                <p className="text-xs text-zinc-500">When someone accepts your friend request</p>
                            </div>
                            <ToggleSwitch
                                checked={emailPrefs.friendRequestAccepted}
                                onChange={(val) => handlePrefToggle('friendRequestAccepted', val)}
                            />
                        </div>
                    </div>

                    <div className="border-t border-white/5 my-3" />

                    {/* Platform */}
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Platform</p>
                    <div className="flex items-center justify-between py-2.5">
                        <div>
                            <p className="text-sm text-white font-medium">OtakuCircle announcements</p>
                            <p className="text-xs text-zinc-500">Platform updates and new feature releases</p>
                        </div>
                        <ToggleSwitch
                            checked={emailPrefs.platformUpdates}
                            onChange={(val) => handlePrefToggle('platformUpdates', val)}
                        />
                    </div>

                    <div className="border-t border-white/5 my-3" />

                    {/* Security Emails (locked) */}
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Security Emails</p>
                    <div className="space-y-0.5">
                        <div className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm text-white font-medium">Password changed</p>
                                <p className="text-xs text-zinc-500">Sent whenever your password is updated</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 font-medium">Always on</span>
                                <ToggleSwitch checked={true} onChange={() => {}} disabled={true} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-sm text-white font-medium">Email address changed</p>
                                <p className="text-xs text-zinc-500">Sent to your old address when email is updated</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 font-medium">Always on</span>
                                <ToggleSwitch checked={true} onChange={() => {}} disabled={true} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Danger Zone card ──────────────────────────────────── */}
                <div className="bg-[#151515] border border-red-900/30 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <h3 className="text-base font-bold text-red-500 flex items-center gap-2 mb-3">
                        <ShieldAlert size={18} /> Danger Zone
                    </h3>
                    <p className="text-zinc-400 text-sm mb-5">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                        onClick={() => setDeleteStep(1)}
                        className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm rounded-xl font-bold transition-colors w-full sm:w-auto"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* ── Delete Modal ─────────────────────────────────────────────── */}
            {deleteStep > 0 && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#151515] border border-white/5 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-red-900/20 ring-1 ring-red-500/20">

                        {/* Step 1 — confirm intent */}
                        {deleteStep === 1 && (
                            <>
                                <h2 className="text-lg font-bold text-white mb-2">Delete your account?</h2>
                                <p className="text-zinc-400 text-sm mb-6">
                                    This action is permanent and cannot be undone. We'll send a verification code to your email to confirm.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setDeleteStep(0)}
                                        className={btnSecondary}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteSendOtp}
                                        disabled={deleteLoading}
                                        className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {deleteLoading ? 'Sending…' : 'Send Verification Code'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Step 2 — enter OTP */}
                        {deleteStep === 2 && (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    <KeyRound size={18} className="text-red-400 shrink-0" />
                                    <p className="text-sm text-zinc-400">
                                        Enter the 6-digit code sent to{' '}
                                        <span className="text-white font-medium">{user.email}</span>
                                    </p>
                                </div>
                                <OtpInput value={deleteOtp} onChange={setDeleteOtp} />
                                <div className="flex gap-3 justify-end mt-4">
                                    <button
                                        onClick={() => { setDeleteStep(1); setDeleteOtp(''); }}
                                        className={btnSecondary}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleDeleteConfirm}
                                        disabled={deleteLoading || deleteOtp.length !== 6}
                                        className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {deleteLoading ? 'Deleting…' : 'Permanently Delete Account'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
