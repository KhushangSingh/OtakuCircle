import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
    Settings, Trash2, Lock, Mail, X, Activity, Film, Tv, 
    LogOut, ShieldAlert, CheckCircle, User, Pencil, TrendingUp, Clock, Star, Zap, Users
} from 'lucide-react';

const Profile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Stats
    const [genreData, setGenreData] = useState([]);
    const [socialStats, setSocialStats] = useState([]);
    const [completionData, setCompletionData] = useState([]);
    const [quickStats, setQuickStats] = useState({ 
        total: 0, 
        completionRate: 0, 
        estimatedHours: 0, 
        avgScore: 0,
        commitmentScore: 0
    });

    // UI
    const [activeTab, setActiveTab] = useState('overview'); 
    const [editingField, setEditingField] = useState(null);
    
    // Modals
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarOptions, setAvatarOptions] = useState([]);
    const [loadingAvatars, setLoadingAvatars] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, animeId: null, type: null, title: '' });
    const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

    // Forms
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [emailData, setEmailData] = useState({ new: '', currentPassword: '' });
    const [usernameData, setUsernameData] = useState(''); 
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Auth
    const currentUser = localStorage.getItem('username');
    const isOwnProfile = username === currentUser;
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // --- HELPER: CALCULATE STATS ---
    const calculateStats = (userData, friendsList = []) => {
        if (!userData || !userData.watchhistory) return;

        const history = userData.watchhistory;
        const watchlist = userData.watchlist || [];
        const totalHistory = history.length;
        
        // Basic Counts
        const watchedCount = history.filter(h => h.status === 'Watched' || h.status === 'Completed').length;
        const watchingCount = history.filter(h => h.status === 'Watching').length;
        const planCount = watchlist.length;
        const totalEntries = watchedCount + watchingCount + planCount;

        // Completion Rate
        const completionRate = totalHistory > 0 ? Math.round((watchedCount / totalHistory) * 100) : 0;

        // Estimated Hours
        const estimatedHours = Math.round(totalHistory * 5); 

        // Avg Score
        const scoredItems = history.filter(h => h.score > 0);
        const avgScore = scoredItems.length > 0 
            ? (scoredItems.reduce((acc, curr) => acc + curr.score, 0) / scoredItems.length).toFixed(1)
            : "N/A";

        // Commitment Score
        const commitmentScore = totalEntries > 0 
            ? Math.round(((watchedCount + watchingCount) / totalEntries) * 100) 
            : 0;

        setQuickStats({ 
            total: totalHistory, 
            completionRate, 
            estimatedHours, 
            avgScore,
            commitmentScore
        });

        // Genre Data
        let genres = [];
        if (userData.stats && userData.stats.genreCounts && Object.keys(userData.stats.genreCounts).length > 0) {
            genres = Object.entries(userData.stats.genreCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        } else if (totalHistory > 0) {
            genres = [
                { name: 'Action', value: Math.ceil(totalHistory * 0.4) },
                { name: 'Drama', value: Math.ceil(totalHistory * 0.3) },
                { name: 'Fantasy', value: Math.ceil(totalHistory * 0.3) },
            ];
        }
        setGenreData(genres);

        // Social Comparison
        let friendsAvg = 0;
        if (friendsList.length > 0) {
            const totalFriendsWatched = friendsList.reduce((acc, curr) => acc + (curr.watchlistCount || 0), 0);
            friendsAvg = Math.round(totalFriendsWatched / friendsList.length);
        }
        setSocialStats([
            { name: 'You', value: totalHistory },
            { name: 'Friends', value: friendsAvg }
        ]);

        // Activity Split
        setCompletionData([
            { name: 'Completed', value: watchedCount, percent: totalEntries > 0 ? (watchedCount/totalEntries)*100 : 0, color: '#10b981' }, 
            { name: 'Watching', value: watchingCount, percent: totalEntries > 0 ? (watchingCount/totalEntries)*100 : 0, color: '#3b82f6' }, 
            { name: 'Plan to Watch', value: planCount, percent: totalEntries > 0 ? (planCount/totalEntries)*100 : 0, color: '#a1a1aa' } 
        ]);
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                
                // Get User
                const userRes = await axios.get(`${API_URL}/users/${username}`);
                const userData = userRes.data;
                setUser(userData);
                setUsernameData(userData.username); 

                // Get Friends (Only if logged in)
                let friendsList = [];
                if (token) {
                    try {
                        const friendsRes = await axios.get(`${API_URL}/friends`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        friendsList = friendsRes.data || [];
                    } catch (e) { console.warn("Friends stats unavailable"); }
                }

                calculateStats(userData, friendsList);

            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [username, API_URL, token]);

    // --- HANDLERS ---
    const handleOpenAvatarModal = async () => {
        setShowAvatarModal(true);
        if (avatarOptions.length === 0) {
            setLoadingAvatars(true);
            try {
                const res = await axios.get('https://api.jikan.moe/v4/top/characters?limit=20');
                setAvatarOptions(res.data.data);
            } catch (error) { console.error("Failed to fetch avatars"); } 
            finally { setLoadingAvatars(false); }
        }
    };

    const handleAvatarUpdate = async (imageUrl) => {
        try {
            await axios.put(`${API_URL}/users/profile`, { profilePicture: imageUrl }, { headers: { Authorization: `Bearer ${token}` } });
            setUser(prev => ({ ...prev, profilePicture: imageUrl }));
            setShowAvatarModal(false);
            setMessage({ type: 'success', text: 'Profile updated!' });
        } catch (error) { setMessage({ type: 'error', text: 'Failed to update avatar' }); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/login'); };

    const handleUsernameChange = async (e) => {
        e.preventDefault();
        if (usernameData === user.username) { setEditingField(null); return; }
        try {
            await axios.put(`${API_URL}/users/profile`, { username: usernameData }, { headers: { Authorization: `Bearer ${token}` } });
            localStorage.setItem('username', usernameData);
            setMessage({ type: 'success', text: 'Username updated' });
            setEditingField(null);
            navigate(`/profile/${usernameData}`); 
        } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Username taken' }); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) { setMessage({ type: 'error', text: 'Mismatch' }); return; }
        try {
            await axios.put(`${API_URL}/users/password`, { currentPassword: passwordData.current, newPassword: passwordData.new }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage({ type: 'success', text: 'Password updated' });
            setEditingField(null);
        } catch (error) { setMessage({ type: 'error', text: 'Error updating' }); }
    };

    const handleEmailChange = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/users/email`, { newEmail: emailData.new, currentPassword: emailData.currentPassword }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage({ type: 'success', text: 'Email updated' });
            setEditingField(null);
            setUser(prev => ({ ...prev, email: emailData.new }));
        } catch (error) { setMessage({ type: 'error', text: 'Error updating' }); }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
            localStorage.clear();
            navigate('/'); 
        } catch (error) { setMessage({ type: 'error', text: 'Delete failed' }); }
    };

    const handleDeleteClick = (animeId, type, title) => { setDeleteConfirm({ show: true, animeId, type, title }); };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm.animeId) return;
        try {
            const endpoint = deleteConfirm.type === 'watchlist' ? `${API_URL}/anime/watchlist/${deleteConfirm.animeId}` : `${API_URL}/anime/watchhistory/${deleteConfirm.animeId}`;
            await axios.delete(endpoint, { headers: { Authorization: `Bearer ${token}` } });
            
            // Optimistic update
            if (deleteConfirm.type === 'watchlist') {
                const updatedList = user.watchlist.filter(i => i.animeId !== deleteConfirm.animeId);
                setUser(prev => ({ ...prev, watchlist: updatedList }));
            } else {
                const updatedHistory = user.watchhistory.filter(i => i.animeId !== deleteConfirm.animeId);
                setUser(prev => ({ ...prev, watchhistory: updatedHistory }));
                calculateStats({ ...user, watchhistory: updatedHistory }, []);
            }
            
            setDeleteConfirm({ show: false, animeId: null, type: null, title: '' });
            setMessage({ type: 'success', text: 'Removed' });
        } catch (error) { setMessage({ type: 'error', text: 'Failed' }); }
    };

    const handleMoveToHistory = async (anime) => {
        try {
            await axios.post(`${API_URL}/anime/watchhistory`, { animeId: anime.animeId, title: anime.title, poster: anime.poster, status: 'Watching' }, { headers: { Authorization: `Bearer ${token}` } });
            await axios.delete(`${API_URL}/anime/watchlist/${anime.animeId}`, { headers: { Authorization: `Bearer ${token}` } });
            window.location.reload(); 
        } catch (error) { setMessage({ type: 'error', text: 'Failed to move' }); }
    };

    const handleStatusChange = async (animeId, newStatus) => {
        try {
            await axios.put(`${API_URL}/anime/watchhistory/${animeId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
            const updatedHistory = user.watchhistory.map(i => i.animeId === animeId ? { ...i, status: newStatus } : i);
            setUser(prev => ({ ...prev, watchhistory: updatedHistory }));
            calculateStats({ ...user, watchhistory: updatedHistory }, []);
            setMessage({ type: 'success', text: 'Updated' });
        } catch (error) { setMessage({ type: 'error', text: 'Failed' }); }
    };

    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>;
    if (!user) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-red-500 font-medium">User not found</div>;

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-gray-100 font-sans pb-20 pt-24">
            
            {/* Toast */}
            {message.text && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${message.type === 'success' ? 'bg-[#0d0d0d] border-green-500/50 text-green-400' : 'bg-[#0d0d0d] border-red-500/50 text-red-400'}`}>
                    <span className="font-semibold text-sm">{message.text}</span>
                </div>
            )}

            <div className="container mx-auto px-6 mb-12">
                
                {/* --- HEADER --- */}
                <div className="relative bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl overflow-hidden mb-8">
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="relative flex-shrink-0 group/avatar">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-[2px] bg-zinc-700 shadow-xl overflow-hidden">
                                {user.profilePicture ? 
                                    <img src={user.profilePicture} className="w-full h-full object-cover rounded-full bg-[#151515]" /> : 
                                    <div className="w-full h-full bg-[#151515] rounded-full flex items-center justify-center text-5xl md:text-6xl font-bold text-white">{user.username.charAt(0).toUpperCase()}</div>
                                }
                            </div>
                            {isOwnProfile && <button onClick={handleOpenAvatarModal} className="absolute bottom-2 right-2 p-2 bg-zinc-500/30 backdrop-blur-md hover:bg-zinc-500/50 text-white rounded-full shadow-lg border border-white/20"><Pencil size={16} /></button>}
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">{user.username}</h1>
                                    <p className="text-zinc-500 text-sm mb-6 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Online</p>
                                </div>
                                {isOwnProfile && <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-wider"><LogOut size={16} /> Logout</button>}
                            </div>

                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                <Zap size={14} fill="currentColor" />
                                Level {Math.floor(Math.sqrt(user.watchhistory?.length || 0)) + 1}
                            </div>
                        </div>
                    </div>
                    {isOwnProfile && (
                        <div className="mt-10 flex gap-6 border-t border-white/5 pt-6">
                            <button onClick={() => setActiveTab('overview')} className={`text-sm font-bold uppercase tracking-widest pb-1 transition-all ${activeTab === 'overview' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}>Overview</button>
                            <button onClick={() => setActiveTab('settings')} className={`text-sm font-bold uppercase tracking-widest pb-1 transition-all ${activeTab === 'settings' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}>Settings</button>
                        </div>
                    )}
                </div>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT: INSIGHTS */}
                        <div className="lg:col-span-1 space-y-6">
                            
                            {/* Card 1: Social Standing */}
                            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Users size={60} /></div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Users size={14} className="text-blue-400"/> Social Standing
                                </h3>
                                <div className="h-[180px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={socialStats} barSize={30}>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                                            <RechartsTooltip 
                                                cursor={{fill: 'transparent'}}
                                                contentStyle={{backgroundColor: '#0d0d0d', border: '1px solid #333', borderRadius: '8px'}}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {socialStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#27272a'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-center text-xs text-zinc-500 mt-2">Anime Completed vs. Friends Avg</p>
                            </div>

                            {/* Card 2: Commitment Index */}
                            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Zap size={60} /></div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Zap size={14} className="text-yellow-400"/> Commitment Index
                                </h3>
                                <div className="flex items-baseline gap-1 mt-4">
                                    <span className="text-5xl font-black text-white tracking-tighter">{quickStats.commitmentScore}</span>
                                    <span className="text-sm text-zinc-500 font-bold">/100</span>
                                </div>
                                <div className="w-full bg-zinc-800/50 h-2 rounded-full mt-4 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000" 
                                        style={{ width: `${quickStats.commitmentScore}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                                    Based on the ratio of anime you finish versus just adding to your list.
                                </p>
                            </div>

                            {/* Card 3: Activity Breakdown */}
                            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-lg">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity size={14} className="text-green-400"/> Activity Split
                                </h3>
                                <div className="space-y-4">
                                    {completionData.map((item) => (
                                        <div key={item.name}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-zinc-300">{item.name}</span>
                                                <span className="text-white font-bold">{item.value}</span>
                                            </div>
                                            <div className="w-full bg-zinc-800/50 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full" 
                                                    style={{ 
                                                        width: `${item.percent}%`,
                                                        backgroundColor: item.color 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: LISTS */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Watchlist */}
                            <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
                                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
                                    <Film className="text-blue-500" size={18} />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Watchlist</h3>
                                    <span className="ml-auto text-xs font-bold text-zinc-500">{user.watchlist?.length || 0} items</span>
                                </div>
                                {user.watchlist?.length > 0 ? (
                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left">
                                            <tbody className="divide-y divide-white/5 text-sm text-zinc-300">
                                                {[...user.watchlist].reverse().map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-3 flex items-center gap-4">
                                                            <img src={item.poster} className="w-8 h-12 object-cover rounded bg-zinc-800" />
                                                            <span className="font-medium text-white truncate max-w-[150px] sm:max-w-xs">{item.title}</span>
                                                        </td>
                                                        {isOwnProfile && (
                                                            <td className="px-6 py-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleMoveToHistory(item)} className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"><Tv size={14}/></button>
                                                                    <button onClick={() => handleDeleteClick(item.animeId, 'watchlist', item.title)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"><Trash2 size={14}/></button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <div className="p-8 text-center text-zinc-500 text-sm">List is empty.</div>}
                            </div>

                            {/* History */}
                            <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
                                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
                                    <Activity className="text-purple-500" size={18} />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">History</h3>
                                    <span className="ml-auto text-xs font-bold text-zinc-500">{user.watchhistory?.length || 0} items</span>
                                </div>
                                {user.watchhistory?.length > 0 ? (
                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left">
                                            <tbody className="divide-y divide-white/5 text-sm text-zinc-300">
                                                {[...user.watchhistory].reverse().map((item, idx) => {
                                                    const currentStatus = item.status || 'Watching';
                                                    const selectClass = currentStatus === 'Watching' 
                                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 focus:border-green-500' 
                                                        : 'bg-red-500/10 border-red-500/20 text-red-400 focus:border-red-500';

                                                    return (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                            <td className="px-6 py-3 flex items-center gap-4">
                                                                <img src={item.poster} className="w-8 h-12 object-cover rounded bg-zinc-800" />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-white truncate max-w-[150px] sm:max-w-xs">{item.title}</span>
                                                                    <span className={`text-[10px] uppercase font-bold ${item.status === 'Watched' ? 'text-green-500' : 'text-blue-500'}`}>{item.status}</span>
                                                                </div>
                                                            </td>
                                                            {isOwnProfile && (
                                                                <>
                                                                    <td className="px-6 py-4">
                                                                        <select 
                                                                            value={currentStatus} 
                                                                            onChange={(e) => handleStatusChange(item.animeId, e.target.value)} 
                                                                            className={`bg-black/40 border text-xs font-bold rounded-lg px-3 py-1.5 outline-none ${selectClass}`}
                                                                        >
                                                                            <option value="Watching" className="bg-[#151515] text-gray-300">Watching</option>
                                                                            <option value="Watched" className="bg-[#151515] text-gray-300">Watched</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <button onClick={() => handleDeleteClick(item.animeId, 'watchhistory', item.title)} className="p-1.5 hover:bg-white/10 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14}/></button>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <div className="p-8 text-center text-zinc-500 text-sm">No history yet.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SETTINGS TAB --- */}
                {activeTab === 'settings' && isOwnProfile && (
                    <div className="max-w-2xl mx-auto bg-[#1a1a1a] border border-white/5 rounded-3xl p-8 space-y-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18} className="text-zinc-400" /> Account Settings</h3>
                        
                        {/* Username Edit */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Username</label>
                            {editingField === 'username' ? (
                                <form onSubmit={handleUsernameChange} className="p-6 bg-[#0d0d0d] rounded-xl border border-white/10 space-y-4">
                                    <input type="text" value={usernameData} onChange={(e) => setUsernameData(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" required />
                                    <div className="flex gap-3">
                                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white">Save</button>
                                        <button type="button" onClick={() => { setEditingField(null); setUsernameData(user.username); }} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold text-zinc-400">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-[#0d0d0d] rounded-xl border border-white/5">
                                    <span className="text-zinc-300 text-sm flex items-center gap-2"><User size={14}/> @{user.username}</span>
                                    <button onClick={() => setEditingField('username')} className="text-xs font-bold text-blue-400 hover:underline">Edit</button>
                                </div>
                            )}
                        </div>

                        {/* Email Edit */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Email Address</label>
                            {editingField === 'email' ? (
                                <form onSubmit={handleEmailChange} className="p-6 bg-[#0d0d0d] rounded-xl border border-white/10 space-y-4">
                                    <input type="email" value={emailData.new} onChange={(e) => setEmailData({ ...emailData, new: e.target.value })} placeholder="New Email" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" required />
                                    <input type="password" value={emailData.currentPassword} onChange={(e) => setEmailData({ ...emailData, currentPassword: e.target.value })} placeholder="Verify Password" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 outline-none" required />
                                    <div className="flex gap-3">
                                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white">Save</button>
                                        <button type="button" onClick={() => setEditingField(null)} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold text-zinc-400">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-[#0d0d0d] rounded-xl border border-white/5">
                                    <span className="text-zinc-300 text-sm flex items-center gap-2"><Mail size={14}/> {user.email}</span>
                                    <button onClick={() => setEditingField('email')} className="text-xs font-bold text-blue-400 hover:underline">Edit</button>
                                </div>
                            )}
                        </div>

                        {/* Password Edit */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Password</label>
                            {editingField === 'password' ? (
                                <form onSubmit={handlePasswordChange} className="p-6 bg-[#0d0d0d] rounded-xl border border-white/10 space-y-4">
                                    <input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} placeholder="Current" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none" required />
                                    <input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} placeholder="New" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none" required />
                                    <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} placeholder="Confirm" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none" required />
                                    <div className="flex gap-3">
                                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white">Update</button>
                                        <button type="button" onClick={() => setEditingField(null)} className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold text-zinc-400">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-[#0d0d0d] rounded-xl border border-white/5">
                                    <span className="text-zinc-300 text-sm flex items-center gap-2"><Lock size={14}/> ••••••••</span>
                                    <button onClick={() => setEditingField('password')} className="text-xs font-bold text-blue-400 hover:underline">Change</button>
                                </div>
                            )}
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 mt-12">
                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldAlert size={16} /> Danger Zone</h3>
                            <button onClick={() => setShowDeleteAccountConfirm(true)} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold transition-all">Delete Account</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals (Avatar, Delete, Confirm) */}
            {showAvatarModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-none flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
                    <div className="bg-[#0f0f0f] rounded-3xl border border-white/10 shadow-3xl max-w-2xl w-full p-8 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Select Avatar</h3>
                            <button onClick={() => setShowAvatarModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {loadingAvatars ? (
                                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin"></div></div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {avatarOptions.map(char => (
                                        <img key={char.mal_id} src={char.images.jpg.image_url} onClick={() => handleAvatarUpdate(char.images.jpg.image_url)} className="rounded-full cursor-pointer hover:opacity-80 transition-opacity" />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-[#151515] rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full p-8 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Remove Item?</h3>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteConfirm({ show: false, animeId: null, type: null, title: '' })} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold">Cancel</button>
                            <button onClick={handleDeleteConfirm} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteAccountConfirm && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-[#151515] rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full p-8 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Delete Account?</h3>
                        <p className="text-zinc-400 text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold">Cancel</button>
                            <button onClick={handleDeleteAccount} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;