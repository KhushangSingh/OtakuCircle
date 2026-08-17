import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
    Trash2, X, Activity, Film, Tv, 
    LogOut, CheckCircle, User, Pencil, TrendingUp, Clock, Star, Zap, Users, Trophy, Award, Crown, Target
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
    const [badges, setBadges] = useState([]);
    const [topPoster, setTopPoster] = useState(null);
    const [quickStats, setQuickStats] = useState({ 
        total: 0, 
        completionRate: 0, 
        estimatedHours: 0, 
        avgScore: 0,
        commitmentScore: 0
    });

    // Modals
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarOptions, setAvatarOptions] = useState([]);
    const [loadingAvatars, setLoadingAvatars] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, animeId: null, type: null, title: '' });
    
    // Auth
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
        
        // Find Top Rated for Banner Background
        const scoredItems = history.filter(h => h.score > 0);
        if (scoredItems.length > 0) {
            const top = [...scoredItems].sort((a, b) => b.score - a.score)[0];
            setTopPoster(top.poster);
        } else if (history.length > 0) {
            setTopPoster(history[0].poster);
        }
        
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

        // Calculate Badges
        const earnedBadges = [];
        if (totalHistory >= 100) earnedBadges.push({ name: 'Otaku Legend', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10' });
        if (completionRate > 90 && totalHistory > 10) earnedBadges.push({ name: 'Completionist', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' });
        if (estimatedHours > 500) earnedBadges.push({ name: 'Binge Watcher', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' });
        if (scoredItems.length > 10 && parseFloat(avgScore) < 6) earnedBadges.push({ name: 'The Critic', icon: Star, color: 'text-red-400', bg: 'bg-red-400/10' });
        if (watchingCount > 10) earnedBadges.push({ name: 'Multitasker', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' });
        
        if (earnedBadges.length === 0) earnedBadges.push({ name: 'Novice Watcher', icon: Target, color: 'text-zinc-400', bg: 'bg-zinc-400/10' });
        setBadges(earnedBadges);

        // Genre Data
        let genres = [];
        if (userData.stats && userData.stats.genreCounts && Object.keys(userData.stats.genreCounts).length > 0) {
            genres = Object.entries(userData.stats.genreCounts)
                .map(([name, value]) => ({ subject: name, A: value, fullMark: Math.max(...Object.values(userData.stats.genreCounts)) }))
                .sort((a, b) => b.A - a.A)
                .slice(0, 5);
        } else if (totalHistory > 0) {
            genres = [
                { subject: 'Action', A: Math.ceil(totalHistory * 0.4), fullMark: totalHistory },
                { subject: 'Drama', A: Math.ceil(totalHistory * 0.3), fullMark: totalHistory },
                { subject: 'Fantasy', A: Math.ceil(totalHistory * 0.3), fullMark: totalHistory },
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
                const query = `
                {
                  Page(perPage: 20) {
                    characters(sort: FAVOURITES_DESC) {
                      id
                      name { full }
                      image { large }
                    }
                  }
                }`;
                const res = await axios.post('https://graphql.anilist.co', { query });
                setAvatarOptions(res.data.data.Page.characters);
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

    const userLevel = Math.floor(Math.sqrt(user.watchhistory?.length || 0)) + 1;

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-20 pt-20 selection:bg-blue-500/30">
            
            {/* Toast */}
            {message.text && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${message.type === 'success' ? 'bg-[#0d0d0d] border-green-500/50 text-green-400' : 'bg-[#0d0d0d] border-red-500/50 text-red-400'}`}>
                    <span className="font-semibold text-sm">{message.text}</span>
                </div>
            )}

            <div className="w-full px-4 lg:px-8 space-y-12">
                
                {/* --- THE IDENTITY (HEADER) --- */}
                <div className="relative w-full rounded-[2.5rem] overflow-hidden mt-6 mb-12 shadow-2xl shadow-blue-900/10 border border-white/[0.05] bg-[#101010]">
                    
                    {/* Dynamic Background Banner */}
                    <div className="absolute inset-0 z-0 h-40 md:h-56 overflow-hidden">
                        {topPoster ? (
                            <>
                                <img src={topPoster} alt="Banner" className="w-full h-full object-cover opacity-40 blur-md scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-[#101010]/60 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 mix-blend-screen"></div>
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900"></div>
                        )}
                    </div>

                    <div className="relative z-10 p-6 md:p-12 pt-16 md:pt-24 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
                        
                        {/* Avatar */}
                        <div className="relative flex-shrink-0 group/avatar">
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden transition-transform duration-500 group-hover/avatar:scale-105">
                                {user.profilePicture ? 
                                    <img src={user.profilePicture} className="w-full h-full object-cover rounded-full bg-[#1a1a1a] border-4 border-[#101010]" /> : 
                                    <div className="w-full h-full bg-[#1a1a1a] rounded-full border-4 border-[#101010] flex items-center justify-center text-4xl md:text-5xl font-black text-white">{user.username.charAt(0).toUpperCase()}</div>
                                }
                            </div>
                            {isOwnProfile && (
                                <button onClick={handleOpenAvatarModal} className="absolute bottom-2 right-2 p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 z-20 border-2 border-[#101010]">
                                    <Pencil size={16} />
                                </button>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 w-full text-center md:text-left space-y-4">
                            <div>
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <div className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online
                                    </div>
                                    <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                                        Level {userLevel}
                                    </div>
                                </div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">{user.username}</h1>
                            </div>

                            {/* Quick Stats Pills */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                                <div className="flex flex-col items-center md:items-start px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-colors backdrop-blur-md">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Watched</span>
                                    <span className="text-xl font-black text-white">{quickStats.total}</span>
                                </div>
                                <div className="flex flex-col items-center md:items-start px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-colors backdrop-blur-md">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Est. Hours</span>
                                    <span className="text-xl font-black text-white">{quickStats.estimatedHours}<span className="text-sm text-zinc-500 ml-1">h</span></span>
                                </div>
                                <div className="flex flex-col items-center md:items-start px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-colors backdrop-blur-md">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Score</span>
                                    <span className="text-xl font-black text-white flex items-center gap-1"><Star size={14} className="text-yellow-500 inline fill-yellow-500"/> {quickStats.avgScore}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {isOwnProfile && (
                            <div className="flex-shrink-0 self-center md:self-end mb-2">
                                <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- OVERVIEW TAB --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* LEFT COLUMN: Insights & Trophies */}
                        <div className="lg:col-span-4 space-y-8">
                            
                            {/* Trophy Case */}
                            <div className="bg-[#151515] rounded-[32px] p-8 shadow-xl">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                    <Trophy size={18} className="text-yellow-500"/> Trophy Case
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {badges.map((badge, idx) => {
                                        const Icon = badge.icon;
                                        return (
                                            <div key={idx} className={`${badge.bg} rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-transform hover:scale-105 cursor-default`}>
                                                <Icon size={28} className={badge.color} />
                                                <span className={`text-xs font-bold ${badge.color}`}>{badge.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Social Standing */}
                            <div className="bg-[#151515] rounded-[32px] p-8 shadow-xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 text-blue-500/5 pointer-events-none"><Users size={120} /></div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                    <TrendingUp size={18} className="text-blue-400"/> Social Standing
                                </h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={socialStats} barSize={40} margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                                            <defs>
                                                <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                                </linearGradient>
                                                <linearGradient id="colorFriends" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.5}/>
                                                    <stop offset="95%" stopColor="#71717a" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 13, fontWeight: 700}} />
                                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1a1a1a', border: 'none', borderRadius: '16px', color: '#fff'}} />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                {socialStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#colorYou)' : 'url(#colorFriends)'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Genre Radar */}
                            {genreData.length > 0 && (
                                <div className="bg-[#151515] rounded-[32px] p-8 shadow-xl">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                                        <Activity size={18} className="text-purple-400"/> Genre DNA
                                    </h3>
                                    <div className="h-[250px] w-full -ml-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={genreData}>
                                                <PolarGrid stroke="#27272a" />
                                                <PolarAngleAxis dataKey="subject" tick={{fill: '#a1a1aa', fontSize: 11}} />
                                                <Radar name="Genres" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
                                                <RechartsTooltip contentStyle={{backgroundColor: '#1a1a1a', border: 'none', borderRadius: '16px', color: '#fff'}} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* RIGHT COLUMN: Lists */}
                        <div className="lg:col-span-8 space-y-8">
                            
                            {/* History */}
                            <div className="bg-[#151515] rounded-[32px] p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-3">
                                        <CheckCircle className="text-green-500" size={18} /> Library History
                                    </h3>
                                    <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-zinc-400">{user.watchhistory?.length || 0} Entries</span>
                                </div>
                                
                                {user.watchhistory?.length > 0 ? (
                                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {[...user.watchhistory].reverse().map((item, idx) => {
                                            const currentStatus = item.status || 'Watching';
                                            const isWatched = currentStatus === 'Watched' || currentStatus === 'Completed';
                                            
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors group">
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <img src={item.poster} className="w-12 h-16 object-cover rounded-xl shadow-md" />
                                                        <div className="flex flex-col flex-1 min-w-0 pr-4">
                                                            <span className="font-bold text-white text-base truncate">{item.title}</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${isWatched ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                                    {item.status}
                                                                </span>
                                                                {item.score > 0 && (
                                                                    <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1"><Star size={10} fill="currentColor"/>{item.score}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {isOwnProfile && (
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <select 
                                                                value={currentStatus} 
                                                                onChange={(e) => handleStatusChange(item.animeId, e.target.value)} 
                                                                className="bg-black/40 border border-white/10 text-xs font-bold rounded-xl px-4 py-2 outline-none text-zinc-300 focus:border-white/20 hover:bg-black/60 transition-colors cursor-pointer appearance-none"
                                                            >
                                                                <option value="Watching" className="bg-[#151515]">Watching</option>
                                                                <option value="Watched" className="bg-[#151515]">Watched</option>
                                                            </select>
                                                            <button onClick={() => handleDeleteClick(item.animeId, 'watchhistory', item.title)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
                                                                <Trash2 size={16}/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <div className="p-12 text-center text-zinc-500 text-sm bg-[#1a1a1a] rounded-2xl">No library history yet.</div>}
                            </div>

                            {/* Watchlist */}
                            <div className="bg-[#151515] rounded-[32px] p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-3">
                                        <Film className="text-blue-500" size={18} /> Up Next (Watchlist)
                                    </h3>
                                    <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-zinc-400">{user.watchlist?.length || 0} Entries</span>
                                </div>
                                
                                {user.watchlist?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                        {[...user.watchlist].reverse().map((item, idx) => (
                                            <div key={idx} className="flex items-center p-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors group">
                                                <img src={item.poster} className="w-12 h-16 object-cover rounded-xl shadow-md mr-4" />
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <span className="font-bold text-white text-sm line-clamp-2">{item.title}</span>
                                                </div>
                                                {isOwnProfile && (
                                                    <div className="flex flex-col gap-2 shrink-0">
                                                        <button onClick={() => handleMoveToHistory(item)} className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors" title="Move to History">
                                                            <Tv size={16}/>
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(item.animeId, 'watchlist', item.title)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors" title="Remove">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="p-12 text-center text-zinc-500 text-sm bg-[#1a1a1a] rounded-2xl">Watchlist is empty.</div>}
                            </div>
                        </div>
                    </div>
            </div>

            {/* Modals (Avatar, Delete, Confirm) */}
            {showAvatarModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
                    <div className="bg-[#151515] rounded-[32px] shadow-2xl max-w-3xl w-full p-8 md:p-10 max-h-[85vh] flex flex-col border border-white/5">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-white">Select Avatar</h3>
                                <p className="text-zinc-400 mt-1 font-medium">Choose from top trending characters</p>
                            </div>
                            <button onClick={() => setShowAvatarModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={24} className="text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                            {loadingAvatars ? (
                                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
                                    {avatarOptions.map(char => (
                                        <div key={char.id} className="relative group cursor-pointer" onClick={() => handleAvatarUpdate(char.image.large)}>
                                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg group-hover:shadow-blue-500/20 transition-all group-hover:scale-105 group-hover:-translate-y-1">
                                                <img src={char.image.large} className="w-full h-full object-cover" alt={char.name?.full || "Avatar"} />
                                            </div>
                                            <p className="text-center text-[10px] font-bold text-zinc-400 mt-2 truncate group-hover:text-white transition-colors">{char.name?.full}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-[#151515] rounded-[32px] border border-white/5 shadow-2xl max-w-md w-full p-10 text-center">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3">Remove Item?</h3>
                        <p className="text-zinc-400 font-medium mb-8">Are you sure you want to remove <span className="text-white">{deleteConfirm.title}</span>?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setDeleteConfirm({ show: false, animeId: null, type: null, title: '' })} className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">Cancel</button>
                            <button onClick={handleDeleteConfirm} className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/50 transition-all hover:scale-105 active:scale-95">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;