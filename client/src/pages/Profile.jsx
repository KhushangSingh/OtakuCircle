import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Tooltip as RechartsTooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
    Trash2, Activity, Film, Tv,
    LogOut, CheckCircle, User, Clock, Star, Zap, Users, Trophy, Award, Crown, Target
} from '../components/icons';
import WatchStatusDropdown from '../components/WatchStatusDropdown';

const Profile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Stats
    const [genreData, setGenreData] = useState([]);
    const [completionData, setCompletionData] = useState([]);
    const [badges, setBadges] = useState([]);
    const [topPoster, setTopPoster] = useState(null);
    const [quickStats, setQuickStats] = useState({ 
        total: 0, 
        completionRate: 0, 
        estimatedHours: 0, 
        avgScore: 0,
        commitmentScore: 0,
        watched: 0,
        watching: 0,
        watchlist: 0,
        animeCount: 0,
        movieCount: 0
    });

    // Modals
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, animeId: null, type: null, title: '' });
    
    // Auth
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Auth
    const currentUser = localStorage.getItem('username');
    const isOwnProfile = username === currentUser;
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // --- HELPER: CALCULATE STATS ---
    const calculateStats = (userData) => {
        if (!userData) return;

        const history = userData.watchhistory || [];
        const watchlist = userData.watchlist || [];
        const movieHistory = userData.movieWatchhistory || [];
        const movieWatchlist = userData.movieWatchlist || [];
        const totalHistory = history.length + movieHistory.length;
        
        // Find Top Rated for Banner Background
        const scoredItems = history.filter(h => h.score > 0);
        if (scoredItems.length > 0) {
            const top = [...scoredItems].sort((a, b) => b.score - a.score)[0];
            setTopPoster(top.poster);
        } else if (history.length > 0) {
            setTopPoster(history[0].poster);
        }
        
        // Basic Counts
        const watchedCount = history.filter(h => h.status === 'Watched' || h.status === 'Completed').length
            + movieHistory.filter(h => h.status === 'Watched' || h.status === 'Completed').length;
        const watchingCount = history.filter(h => h.status === 'Watching').length
            + movieHistory.filter(h => h.status === 'Watching').length;
        const planCount = watchlist.length + movieWatchlist.length;
        const totalEntries = watchedCount + watchingCount + planCount;

        // Completion Rate
        const completionRate = totalHistory > 0 ? Math.round((watchedCount / totalHistory) * 100) : 0;

        // Estimated Hours
        const estimatedHours = Math.round((history.length * 5) + (movieHistory.length * 2));

        // Avg Score
        const avgScore = scoredItems.length > 0 
            ? (scoredItems.reduce((acc, curr) => acc + curr.score, 0) / scoredItems.length).toFixed(2)
            : "N/A";

        // Commitment Score
        const commitmentScore = totalEntries > 0 
            ? Math.round(((watchedCount + watchingCount) / totalEntries) * 100) 
            : 0;

        const serverStats = userData.dashboardStats;
        setQuickStats(serverStats ? {
            ...serverStats,
            avgScore: serverStats.averageScore ?? "N/A"
        } : {
            total: totalHistory, 
            completionRate, 
            estimatedHours, 
            avgScore,
            commitmentScore,
            watched: watchedCount,
            watching: watchingCount,
            watchlist: planCount,
            animeCount: history.length + watchlist.length,
            movieCount: movieHistory.length + movieWatchlist.length
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
        }
        setGenreData(genres);

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

                calculateStats(userData);

            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [username, API_URL, token]);

    // --- HANDLERS ---
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
                calculateStats({ ...user, watchhistory: updatedHistory });
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
            calculateStats({ ...user, watchhistory: updatedHistory });
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
                <div className="relative w-full rounded-3xl overflow-hidden mt-4 mb-8 shadow-xl shadow-blue-900/10 border border-white/[0.05] bg-[#101010]">
                    
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

                    <div className="relative z-10 p-5 md:p-8 pt-14 md:pt-20 flex flex-col md:flex-row gap-5 md:gap-7 items-center md:items-end">
                        
                        {/* Avatar */}
                        <div className="relative flex-shrink-0 group/avatar">
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden">
                                {user.profilePicture ? 
                                    <img src={user.profilePicture} className="w-full h-full object-cover rounded-full bg-[#1a1a1a] border-4 border-[#101010]" /> : 
                                    <div className="w-full h-full bg-[#1a1a1a] rounded-full border-4 border-[#101010] flex items-center justify-center text-4xl md:text-5xl font-black text-white">{user.username.charAt(0).toUpperCase()}</div>
                                }
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 w-full text-center md:text-left space-y-4">
                            <div>
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                                        Level {userLevel}
                                    </div>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{user.username}</h1>
                            </div>

                        </div>

                        {/* Action Buttons */}
                    </div>
                </div>

                {/* --- PERSONAL DASHBOARD --- */}
                <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[
                        ['Watched', quickStats.watched, 'text-emerald-300'],
                        ['Watching', quickStats.watching, 'text-blue-300'],
                        ['Watchlist', quickStats.watchlist, 'text-purple-300'],
                        ['Watch time', `${quickStats.estimatedHours}h`, 'text-white'],
                        ['Average score', quickStats.avgScore, 'text-yellow-300'],
                        ['Completion', `${quickStats.completionRate}%`, 'text-cyan-300']
                    ].map(([label, value, color]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-lg">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</p>
                            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
                        </div>
                    ))}
                </section>
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#151515] p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Library mix</h2>
                            <span className="text-xs text-zinc-500">{quickStats.total} tracked titles</span>
                        </div>
                        <div className="space-y-4">
                            {[
                                ['Watched', quickStats.watched, 'bg-emerald-400'],
                                ['Watching', quickStats.watching, 'bg-blue-400'],
                                ['Watchlist', quickStats.watchlist, 'bg-purple-400']
                            ].map(([label, value, color]) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs mb-1"><span className="text-zinc-400">{label}</span><span className="text-white font-bold">{value}</span></div>
                                    <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${quickStats.total ? Math.min(100, (value / quickStats.total) * 100) : 0}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-[#151515] p-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-5">Library split</h2>
                        <div className="flex items-end gap-3 h-28">
                            {[['Anime', quickStats.animeCount, 'bg-pink-400'], ['Movies', quickStats.movieCount, 'bg-orange-400']].map(([label, value, color]) => (
                                <div key={label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                    <span className="text-sm font-bold text-white">{value}</span>
                                    <div className={`w-full ${color} rounded-t-lg transition-all duration-700`} style={{ height: `${Math.max(8, quickStats.total ? (value / quickStats.total) * 100 : 8)}%` }} />
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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
                                                                    <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1"><Star size={10} fill="currentColor"/>{Number(item.score).toFixed(2)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {isOwnProfile && (
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <WatchStatusDropdown 
                                                                currentStatus={currentStatus} 
                                                                onStatusChange={(status) => handleStatusChange(item.animeId, status)}
                                                                wrapperClass="w-32"
                                                            />
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

            {/* Modals (Delete, Confirm) */}
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