import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Settings as SettingsIcon, User, Mail, Lock, ShieldAlert } from 'lucide-react';

const Settings = () => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Forms
    const [editingField, setEditingField] = useState(null);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [emailData, setEmailData] = useState({ new: '', currentPassword: '' });
    const [usernameData, setUsernameData] = useState(''); 
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
    
    // Auth
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchUserData = async () => {
            if (!token || !username) {
                navigate('/login');
                return;
            }
            try {
                const userRes = await axios.get(`${API_URL}/users/${username}`);
                setUser(userRes.data);
                setUsernameData(userRes.data.username); 
            } catch (error) {
                console.error('Error fetching user data:', error);
                setMessage({ type: 'error', text: 'Failed to load settings data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [username, token, API_URL, navigate]);

    // --- HANDLERS ---
    const handleUsernameChange = async (e) => {
        e.preventDefault();
        if (usernameData === user.username) { setEditingField(null); return; }
        try {
            await axios.put(`${API_URL}/users/profile`, { username: usernameData }, { headers: { Authorization: `Bearer ${token}` } });
            localStorage.setItem('username', usernameData);
            setMessage({ type: 'success', text: 'Username updated' });
            setEditingField(null);
            // Reload page to reflect new username in URL and storage cleanly
            window.location.reload(); 
        } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Username taken' }); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) { setMessage({ type: 'error', text: 'Passwords do not match' }); return; }
        try {
            await axios.put(`${API_URL}/users/password`, { currentPassword: passwordData.current, newPassword: passwordData.new }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage({ type: 'success', text: 'Password updated' });
            setEditingField(null);
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) { setMessage({ type: 'error', text: 'Error updating password' }); }
    };

    const handleEmailChange = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/users/email`, { newEmail: emailData.new, currentPassword: emailData.currentPassword }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage({ type: 'success', text: 'Email updated' });
            setEditingField(null);
            setUser(prev => ({ ...prev, email: emailData.new }));
            setEmailData({ new: '', currentPassword: '' });
        } catch (error) { setMessage({ type: 'error', text: 'Error updating email' }); }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
            localStorage.clear();
            navigate('/'); 
        } catch (error) { setMessage({ type: 'error', text: 'Delete failed' }); }
    };

    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>;
    if (!user) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-red-500 font-medium">Please login to view settings.</div>;

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-20 pt-28 px-4 lg:px-8 selection:bg-blue-500/30">
            
            {/* Toast */}
            {message.text && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${message.type === 'success' ? 'bg-[#0d0d0d] border-green-500/50 text-green-400' : 'bg-[#0d0d0d] border-red-500/50 text-red-400'}`}>
                    <span className="font-semibold text-sm">{message.text}</span>
                </div>
            )}

            <div className="max-w-3xl mx-auto space-y-8">
                
                <div className="bg-[#151515] rounded-[32px] p-6 md:p-12 shadow-xl space-y-8 md:space-y-12 ring-1 ring-white/5">
                    <h1 className="text-3xl font-black text-white flex items-center gap-4 border-b border-white/5 pb-6">
                        <SettingsIcon className="text-blue-500" size={32} /> Account Settings
                    </h1>
                    
                    {/* Username Edit */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Username</label>
                        {editingField === 'username' ? (
                            <form onSubmit={handleUsernameChange} className="p-6 bg-[#1a1a1a] rounded-2xl space-y-4">
                                <input type="text" value={usernameData} onChange={(e) => setUsernameData(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-bold focus:border-blue-500 focus:bg-black/60 outline-none transition-all" required />
                                <div className="flex gap-3">
                                    <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-colors">Save Changes</button>
                                    <button type="button" onClick={() => { setEditingField(null); setUsernameData(user.username); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-zinc-300 transition-colors">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between p-6 bg-[#1a1a1a] rounded-2xl group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-white font-bold text-lg flex items-center gap-3"><User className="text-zinc-500"/> @{user.username}</span>
                                <button onClick={() => setEditingField('username')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">Edit</button>
                            </div>
                        )}
                    </div>

                    {/* Email Edit */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Email Address</label>
                        {editingField === 'email' ? (
                            <form onSubmit={handleEmailChange} className="p-6 bg-[#1a1a1a] rounded-2xl space-y-4">
                                <input type="email" value={emailData.new} onChange={(e) => setEmailData({ ...emailData, new: e.target.value })} placeholder="New Email" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-bold focus:border-blue-500 focus:bg-black/60 outline-none transition-all" required />
                                <input type="password" value={emailData.currentPassword} onChange={(e) => setEmailData({ ...emailData, currentPassword: e.target.value })} placeholder="Verify Password" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-bold focus:border-blue-500 focus:bg-black/60 outline-none transition-all" required />
                                <div className="flex gap-3">
                                    <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-colors">Save Changes</button>
                                    <button type="button" onClick={() => { setEditingField(null); setEmailData({ new: '', currentPassword: '' }); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-zinc-300 transition-colors">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between p-6 bg-[#1a1a1a] rounded-2xl group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-white font-bold text-lg flex items-center gap-3"><Mail className="text-zinc-500"/> {user.email}</span>
                                <button onClick={() => setEditingField('email')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">Edit</button>
                            </div>
                        )}
                    </div>

                    {/* Password Edit */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Password</label>
                        {editingField === 'password' ? (
                            <form onSubmit={handlePasswordChange} className="p-6 bg-[#1a1a1a] rounded-2xl space-y-4">
                                <input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} placeholder="Current Password" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-bold focus:border-blue-500 focus:bg-black/60 outline-none transition-all" required />
                                <input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} placeholder="New Password" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-bold focus:border-blue-500 focus:bg-black/60 outline-none transition-all" required />
                                <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} placeholder="Confirm New Password" className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-bold focus:border-blue-500 focus:bg-black/60 outline-none transition-all" required />
                                <div className="flex gap-3">
                                    <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-colors">Update Password</button>
                                    <button type="button" onClick={() => { setEditingField(null); setPasswordData({ current: '', new: '', confirm: '' }); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-zinc-300 transition-colors">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between p-6 bg-[#1a1a1a] rounded-2xl group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-white font-bold text-lg flex items-center gap-3"><Lock className="text-zinc-500"/> ••••••••</span>
                                <button onClick={() => setEditingField('password')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">Change</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-[#151515] rounded-[32px] p-6 md:p-12 shadow-xl border border-red-900/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <h3 className="text-lg font-black text-red-500 flex items-center gap-3 mb-6"><ShieldAlert /> Danger Zone</h3>
                    <p className="text-zinc-400 mb-8 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
                    <button onClick={() => setShowDeleteAccountConfirm(true)} className="px-8 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-colors w-full sm:w-auto">
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showDeleteAccountConfirm && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#151515] rounded-3xl p-8 max-w-md w-full ring-1 ring-red-500/20 shadow-2xl shadow-red-900/20">
                        <h2 className="text-xl font-black text-white mb-2">Are you sure?</h2>
                        <p className="text-zinc-400 mb-8 text-sm">This action cannot be undone. This will permanently delete your account and remove your data from our servers.</p>
                        <div className="flex gap-4 justify-end">
                            <button onClick={() => setShowDeleteAccountConfirm(false)} className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={handleDeleteAccount} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20">Delete My Account</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
