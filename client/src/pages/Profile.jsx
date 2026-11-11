import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Trash2, Activity, Film, Tv,
    CheckCircle, PlayCircle, Bookmark, Trophy,
    Star, Crown, Clock, Target, Zap, Lock
} from '../components/icons';
import WatchStatusDropdown from '../components/WatchStatusDropdown';

export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [libraryMediaFilter, setLibraryMediaFilter] = useState('all'); // 'all' | 'anime' | 'manga'
    
    // Stats
    const [genrePreferences, setGenrePreferences] = useState([]);
    const [globalRanking, setGlobalRanking] = useState({
        totalCompleted: 0,
        rankTier: 'Novice Watcher',
        percentile: 'Top 70%',
        level: 1
    });
    const [badges, setBadges] = useState([]);
    const [topPoster, setTopPoster] = useState(null);
    const [quickStats, setQuickStats] = useState({ 
        total: 0, 
        completionRate: 0, 
        estimatedHours: 0, 
        avgScore: 0,
        watched: 0,
        watching: 0,
        watchlist: 0,
        animeCount: 0,
        movieCount: 0
    });

    // Modals
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, animeId: null, type: null, title: '' });
    
    // Auth & Messages
    const [message, setMessage] = useState({ type: '', text: '' });
    const currentUser = localStorage.getItem('username');
    const isOwnProfile = username === currentUser;
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Maximum genre count for proportional bar scaling
    const maxGenreCount = useMemo(() => {
        if (!genrePreferences.length) return 1;
        return Math.max(...genrePreferences.map(g => g.count), 1);
    }, [genrePreferences]);

    // --- HELPER: CALCULATE STATS ---
    const calculateStats = (userData) => {
        if (!userData) return;

        const history = userData.watchhistory || [];
        const watchlist = userData.watchlist || [];
        const isManga = (item) => item.mediaType === 'manga' || (item.type || '').toLowerCase().includes('manga');
        
        // Find Top Rated for Banner Background
        const scoredItems = history.filter(h => h.score > 0);
        if (scoredItems.length > 0) {
            const top = [...scoredItems].sort((a, b) => b.score - a.score)[0];
            setTopPoster(top.poster);
        } else if (history.length > 0) {
            setTopPoster(history[0].poster);
        }
        
        // Basic Verified Counts
        const isCompleted = (h) => h.status === 'Watched' || h.status === 'Completed';
        const completedAnime = history.filter(h => !isManga(h) && isCompleted(h)).length;
        const completedManga = history.filter(h => isManga(h) && isCompleted(h)).length;
        const watchingAnime = history.filter(h => !isManga(h) && h.status === 'Watching').length;
        const readingManga = history.filter(h => isManga(h) && (h.status === 'Reading' || h.status === 'Watching')).length;
        const plannedAnime = watchlist.filter(h => !isManga(h)).length;
        const plannedManga = watchlist.filter(h => isManga(h)).length;

        const totalWatched = completedAnime + completedManga;
        const totalTracked = history.length + watchlist.length;

        const completionRate = history.length > 0 ? Math.round((totalWatched / history.length) * 100) : 0;

        const avgScore = scoredItems.length > 0 
            ? (scoredItems.reduce((acc, curr) => acc + curr.score, 0) / scoredItems.length).toFixed(2)
            : null;

        const serverStats = userData.dashboardStats;
        setQuickStats(serverStats ? {
            ...serverStats,
            avgScore: serverStats.averageScore ?? avgScore,
            totalTracked: serverStats.totalTracked ?? totalTracked,
            completedAnime: serverStats.completedAnime ?? completedAnime,
            completedManga: serverStats.completedManga ?? completedManga,
            watchingAnime: serverStats.watchingAnime ?? watchingAnime,
            readingManga: serverStats.readingManga ?? readingManga,
            plannedAnime: serverStats.plannedAnime ?? plannedAnime,
            plannedManga: serverStats.plannedManga ?? plannedManga,
            completionRate: serverStats.completionRate ?? completionRate
        } : {
            totalTracked,
            totalWatched,
            completedAnime,
            completedManga,
            watchingAnime,
            readingManga,
            plannedAnime,
            plannedManga,
            completionRate,
            avgScore,
            recsOverview: {
                total: userData.recommendations?.length || 0,
                active: (userData.recommendations || []).filter(r => !r.status || r.status === 'active').length,
                planned: (userData.recommendations || []).filter(r => r.status === 'planned').length,
                completed: (userData.recommendations || []).filter(r => r.status === 'completed').length,
                archived: (userData.recommendations || []).filter(r => r.status === 'archived').length,
                notInterested: (userData.recommendations || []).filter(r => r.status === 'not_interested').length
            }
        });

        // Global Ranking setup
        if (serverStats?.globalRanking) {
            setGlobalRanking(serverStats.globalRanking);
        } else {
            let rankTier = 'Novice Explorer';
            if (totalWatched >= 100) rankTier = 'Otaku Legend';
            else if (totalWatched >= 50) rankTier = 'Master Otaku';
            else if (totalWatched >= 25) rankTier = 'Avid Enthusiast';
            else if (totalWatched >= 10) rankTier = 'Dedicated Watcher';
            else if (totalWatched >= 5) rankTier = 'Rising Fan';
            else if (totalWatched >= 1) rankTier = 'Active Explorer';

            setGlobalRanking({
                totalCompleted: totalWatched,
                rankTier,
                level: Math.floor(Math.sqrt(totalWatched)) + 1
            });
        }

        // Genre Preferences Setup (Prioritize server sortedGenres, fallback to stats.genreCounts)
        if (serverStats?.sortedGenres && serverStats.sortedGenres.length > 0) {
            setGenrePreferences(serverStats.sortedGenres);
        } else if (userData.stats?.genreCounts && Object.keys(userData.stats.genreCounts).length > 0) {
            const counts = userData.stats.genreCounts;
            const totalOccurrences = Object.values(counts).reduce((a, b) => a + b, 0);
            const sorted = Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([genre, count], idx) => ({
                    genre,
                    count,
                    percentage: totalOccurrences > 0 ? Math.round((count / totalOccurrences) * 100) : 0,
                    isTop: idx === 0
                }));
            setGenrePreferences(sorted);
        }

        // Calculate Badges
        const earnedBadges = [];
        if (watchedCount >= 100) earnedBadges.push({ name: 'Otaku Legend', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10' });
        if (completionRate > 90 && watchedCount > 10) earnedBadges.push({ name: 'Completionist', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' });
        if (estimatedHours > 200) earnedBadges.push({ name: 'Binge Watcher', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' });
        if (watchingCount >= 5) earnedBadges.push({ name: 'Multitasker', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' });
        if (watchedCount >= 10) earnedBadges.push({ name: 'Avid Watcher', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-400/10' });
        
        if (earnedBadges.length === 0) earnedBadges.push({ name: 'Novice Watcher', icon: Target, color: 'text-zinc-400', bg: 'bg-zinc-400/10' });
        setBadges(earnedBadges);
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const userRes = await axios.get(`${API_URL}/users/${username}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                const userData = userRes.data;
                setUser(userData);
                calculateStats(userData);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [username, API_URL]);

    // --- HANDLERS ---
    const handleDeleteClick = (animeId, type, title) => { 
        setDeleteConfirm({ show: true, animeId, type, title }); 
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm.animeId) return;
        try {
            const endpoint = deleteConfirm.type === 'watchlist' 
                ? `${API_URL}/anime/watchlist/${deleteConfirm.animeId}` 
                : `${API_URL}/anime/watchhistory/${deleteConfirm.animeId}`;
            await axios.delete(endpoint, { headers: { Authorization: `Bearer ${token}` } });
            
            // Optimistic update
            if (deleteConfirm.type === 'watchlist') {
                const updatedList = user.watchlist.filter(i => i.animeId !== deleteConfirm.animeId);
                setUser(prev => ({ ...prev, watchlist: updatedList }));
                calculateStats({ ...user, watchlist: updatedList });
            } else {
                const updatedHistory = user.watchhistory.filter(i => i.animeId !== deleteConfirm.animeId);
                setUser(prev => ({ ...prev, watchhistory: updatedHistory }));
                calculateStats({ ...user, watchhistory: updatedHistory });
            }
            
            setDeleteConfirm({ show: false, animeId: null, type: null, title: '' });
            setMessage({ type: 'success', text: 'Item removed from your library' });
        } catch (error) { 
            setMessage({ type: 'error', text: 'Failed to delete' }); 
        }
    };

    const handleMoveToHistory = async (anime) => {
        try {
            await axios.post(`${API_URL}/anime/watchhistory`, { 
                animeId: anime.animeId, 
                title: anime.title, 
                poster: anime.poster, 
                status: 'Watching' 
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            await axios.delete(`${API_URL}/anime/watchlist/${anime.animeId}`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            
            window.location.reload(); 
        } catch (error) { 
            setMessage({ type: 'error', text: 'Failed to move to history' }); 
        }
    };

    const handleStatusChange = async (animeId, newStatus) => {
        try {
            await axios.put(`${API_URL}/anime/watchhistory/${animeId}`, { 
                status: newStatus 
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            const updatedHistory = user.watchhistory.map(i => i.animeId === animeId ? { ...i, status: newStatus } : i);
            setUser(prev => ({ ...prev, watchhistory: updatedHistory }));
            calculateStats({ ...user, watchhistory: updatedHistory });
            setMessage({ type: 'success', text: 'Watch status updated' });
        } catch (error) { 
            setMessage({ type: 'error', text: 'Failed to update status' }); 
        }
    };

    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );
    
    if (!user) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-red-500 font-medium">
            User not found
        </div>
    );

    const userLevel = globalRanking.level || Math.floor(Math.sqrt(user.watchhistory?.length || 0)) + 1;

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-24 pt-24 selection:bg-blue-500/30">
            
            {/* Feedback Toast */}
            {message.text && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
                    message.type === 'success' ? 'bg-[#121212] border-emerald-500/50 text-emerald-400' : 'bg-[#121212] border-red-500/50 text-red-400'
                }`}>
                    <span className="font-semibold text-sm">{message.text}</span>
                </div>
            )}

            <div className="w-full px-4 sm:px-6 lg:px-12 max-w-[1400px] mx-auto space-y-10">
                
                {/* --- HEADER IDENTITY --- */}
                <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-white/[0.08] bg-[#121212]">
                    {/* Dynamic Banner Scrim */}
                    <div className="absolute inset-0 z-0 h-44 md:h-56 overflow-hidden">
                        {topPoster ? (
                            <>
                                <img src={topPoster} alt="Banner" className="w-full h-full object-cover opacity-35 blur-md scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 mix-blend-screen" />
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
                        )}
                    </div>

                    <div className="relative z-10 p-5 md:p-8 pt-16 md:pt-24 flex flex-col md:flex-row gap-5 md:gap-7 items-center md:items-end">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden">
                                {user.profilePicture ? (
                                    <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover rounded-full bg-[#181818] border-4 border-[#121212]" />
                                ) : (
                                    <div className="w-full h-full bg-[#181818] rounded-full border-4 border-[#121212] flex items-center justify-center text-4xl md:text-5xl font-black text-white">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Metadata */}
                        <div className="flex-1 w-full text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                                {user.username}
                            </h1>
                            <div className="text-zinc-400 text-xs mt-1.5 flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span>Cataloging anime journey on OtakuCircle</span>
                                <span>• Level {userLevel}</span>
                                <span>• {globalRanking.rankTier}</span>
                                {isOwnProfile && (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/settings')}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 transition-colors cursor-pointer ml-1"
                                        title="Click to manage privacy toggles in Settings"
                                    >
                                        <Lock size={10} className={user.privacySettings?.shareLibrary ? "text-emerald-400" : "text-amber-400"} />
                                        <span>Library: {user.privacySettings?.shareLibrary ? "Shared" : "Private"}</span>
                                        <span>•</span>
                                        <span>Stats: {user.privacySettings?.shareStats ? "Shared" : "Private"}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================================ */}
                {/* DEDICATED ANALYTICS: LIBRARY, GENRE, RECS (Verified Metrics Only) */}
                {/* ============================================================ */}
                {user.statsPrivate ? (
                    <section className="bg-[#121212] border border-white/10 rounded-3xl p-10 sm:p-14 text-center shadow-2xl">
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-zinc-400">
                            <Lock size={22} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5">Statistics are Private</h3>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                            {user.username} has chosen to keep their entertainment statistics and genre distribution private.
                        </p>
                    </section>
                ) : (
                <section className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                                {isOwnProfile ? 'Your Entertainment Journey' : `${user.username}'s Journey`}
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">
                                Verified personal analytics: library status, catalog genre distribution, and friend recommendations.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
                            <span>Level <strong className="text-white font-bold">{globalRanking.level || 1}</strong></span>
                            <span>•</span>
                            <span className="font-semibold text-blue-400">{globalRanking.rankTier || 'Novice Explorer'}</span>
                        </div>
                    </div>

                    {/* Row 1: Library Summary (Anime & Manga Verified Breakdown) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        
                        {/* 1. Completed */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-white/15 transition-all">
                            <div>
                                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                                    {(quickStats.completedAnime || 0) + (quickStats.completedManga || 0)}
                                </span>
                                <p className="text-xs font-semibold text-zinc-300 mt-1">Completed</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    {quickStats.completedAnime || 0} Anime · {quickStats.completedManga || 0} Manga
                                </p>
                            </div>
                        </div>

                        {/* 2. Currently In-Progress */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-white/15 transition-all">
                            <div>
                                <span className="text-2xl sm:text-3xl font-extrabold text-blue-400 tracking-tight">
                                    {(quickStats.watchingAnime || 0) + (quickStats.readingManga || 0)}
                                </span>
                                <p className="text-xs font-semibold text-zinc-300 mt-1">In Progress</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    {quickStats.watchingAnime || 0} Watching · {quickStats.readingManga || 0} Reading
                                </p>
                            </div>
                        </div>

                        {/* 3. Plan to Watch / Read */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-white/15 transition-all">
                            <div>
                                <span className="text-2xl sm:text-3xl font-extrabold text-purple-300 tracking-tight">
                                    {(quickStats.plannedAnime || 0) + (quickStats.plannedManga || 0)}
                                </span>
                                <p className="text-xs font-semibold text-zinc-300 mt-1">Plan to Watch / Read</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    {quickStats.plannedAnime || 0} Anime · {quickStats.plannedManga || 0} Manga
                                </p>
                            </div>
                        </div>

                        {/* 4. Total Tracked Titles */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between hover:border-white/15 transition-all">
                            <div>
                                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                    {quickStats.totalTracked || ((user.watchhistory?.length || 0) + (user.watchlist?.length || 0))}
                                </span>
                                <p className="text-xs font-semibold text-zinc-300 mt-1">Total Cataloged</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    {quickStats.completionRate || 0}% library completion
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="my-8 border-t border-white/10" />

                    {/* Row 2: Genre Distribution (Derived from Library Titles) */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                {isOwnProfile ? 'Your Genre Distribution' : `${user.username}'s Genre Distribution`}
                            </h3>
                            <span className="text-xs text-zinc-500 font-medium">
                                Proportional catalog distribution
                            </span>
                        </div>

                        {genrePreferences.length > 0 ? (
                            <div className="space-y-4">
                                {genrePreferences.map((item) => (
                                    <div key={item.genre} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs sm:text-sm">
                                            <span className="font-semibold text-white">{item.genre}</span>
                                            <span className={`text-xs font-medium ${item.isTop ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                                                {item.isTop ? 'Most cataloged' : `${item.count} titles (${item.percentage}%)`}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${item.isTop ? 'bg-white' : 'bg-zinc-300'}`} 
                                                style={{ width: `${Math.max(6, (item.count / maxGenreCount) * 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-zinc-500 text-xs bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                No genre data yet. Mark titles as watched or reading to see your genre distribution.
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="my-8 border-t border-white/10" />

                    {/* Row 3: Recommendations Overview (Received from Friends) */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                Friend Recommendations Overview
                            </h3>
                            <span className="text-xs text-zinc-500 font-medium">
                                Received social suggestions
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Received</p>
                                <p className="text-xl font-extrabold text-white mt-1">
                                    {quickStats.recsOverview?.total ?? (user.recommendations?.length || 0)}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Active In Inbox</p>
                                <p className="text-xl font-extrabold text-blue-300 mt-1">
                                    {quickStats.recsOverview?.active ?? (user.recommendations || []).filter(r => !r.status || r.status === 'active').length}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Planned To Watch/Read</p>
                                <p className="text-xl font-extrabold text-purple-300 mt-1">
                                    {quickStats.recsOverview?.planned ?? (user.recommendations || []).filter(r => r.status === 'planned').length}
                                </p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Completed</p>
                                <p className="text-xl font-extrabold text-emerald-300 mt-1">
                                    {quickStats.recsOverview?.completed ?? (user.recommendations || []).filter(r => r.status === 'completed').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Verified Summary Footer */}
                    <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">
                            Average Rating: <strong className="text-yellow-400">{quickStats.avgScore ? `★ ${quickStats.avgScore}` : 'None rated yet'}</strong>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">
                            Library Completion: <strong className="text-cyan-300">{quickStats.completionRate || 0}%</strong>
                        </span>
                    </div>
                </section>
                )}

                {/* ============================================================ */}
                {/* TROPHIES & LIBRARY LISTS SECTION                             */}
                {/* ============================================================ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: Trophy Case */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2.5">
                                Trophy Case
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {badges.map((badge, idx) => {
                                    const Icon = badge.icon;
                                    return (
                                        <div key={idx} className={`${badge.bg} rounded-2xl p-3.5 flex flex-col items-center justify-center text-center gap-2 border border-white/5 transition-transform hover:scale-105 cursor-default`}>
                                            <Icon size={24} className={badge.color} />
                                            <span className={`text-xs font-bold ${badge.color}`}>{badge.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Library History & Watchlist */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Completed / History List */}
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                                    <CheckCircle className="text-emerald-400" size={16} /> Library History
                                </h3>
                                
                                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                                    {['all', 'anime', 'manga'].map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setLibraryMediaFilter(tab)}
                                            className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                                                libraryMediaFilter === tab
                                                    ? 'bg-white text-black'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {user.watchhistory?.length > 0 ? (
                                <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                                    {[...user.watchhistory].reverse().filter(item => {
                                        if (libraryMediaFilter === 'anime') return item.mediaType !== 'manga';
                                        if (libraryMediaFilter === 'manga') return item.mediaType === 'manga';
                                        return true;
                                    }).map((item, idx) => {
                                        const currentStatus = item.status || 'Watching';
                                        const isWatched = currentStatus === 'Watched' || currentStatus === 'Completed';
                                        
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group">
                                                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                    <img src={item.poster || 'https://via.placeholder.com/100x150'} alt={item.title} className="w-11 h-15 object-cover rounded-xl shadow-md bg-zinc-800 shrink-0" />
                                                    <div className="flex flex-col flex-1 min-w-0 pr-3">
                                                        <span className="font-bold text-white text-sm truncate">{item.title}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${isWatched ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                                {item.status}
                                                            </span>
                                                            {item.score > 0 && (
                                                                <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                                                                    <Star size={10} fill="currentColor"/>{Number(item.score).toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isOwnProfile && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <WatchStatusDropdown 
                                                            currentStatus={currentStatus} 
                                                            onStatusChange={(status) => handleStatusChange(item.animeId, status)}
                                                            wrapperClass="w-32"
                                                        />
                                                        <button 
                                                            onClick={() => handleDeleteClick(item.animeId, 'watchhistory', item.title)} 
                                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash2 size={15}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-10 text-center text-zinc-500 text-sm bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                    No library history yet.
                                </div>
                            )}
                        </div>

                        {/* Watchlist List */}
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                                    <Film className="text-purple-400" size={16} /> Up Next (Watchlist)
                                </h3>
                                <span className="px-3 py-0.5 bg-white/5 rounded-full text-xs font-bold text-zinc-400">
                                    {user.watchlist?.length || 0} Entries
                                </span>
                            </div>
                            
                            {user.watchlist?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                                    {[...user.watchlist].reverse().filter(item => {
                                        if (libraryMediaFilter === 'anime') return item.mediaType !== 'manga';
                                        if (libraryMediaFilter === 'manga') return item.mediaType === 'manga';
                                        return true;
                                    }).map((item, idx) => (
                                        <div key={idx} className="flex items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all">
                                            <img src={item.poster || 'https://via.placeholder.com/100x150'} alt={item.title} className="w-11 h-15 object-cover rounded-xl shadow-md mr-3 shrink-0 bg-zinc-800" />
                                            <div className="flex-1 min-w-0 mr-3">
                                                <span className="font-bold text-white text-xs sm:text-sm line-clamp-2">{item.title}</span>
                                            </div>
                                            {isOwnProfile && (
                                                <div className="flex flex-col gap-1.5 shrink-0">
                                                    <button 
                                                        onClick={() => handleMoveToHistory(item)} 
                                                        className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors" 
                                                        title="Mark Watching"
                                                    >
                                                        <Tv size={14}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteClick(item.animeId, 'watchlist', item.title)} 
                                                        className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors" 
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center text-zinc-500 text-sm bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                    Watchlist is empty.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Removal Confirmation Dialog */}
            {deleteConfirm.show && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
                    <div className="bg-[#141414] rounded-3xl border border-white/10 shadow-2xl max-w-md w-full p-8 text-center">
                        <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Trash2 size={22} />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Remove Item?</h3>
                        <p className="text-zinc-400 text-xs sm:text-sm mb-6">
                            Are you sure you want to remove <span className="text-white font-semibold">{deleteConfirm.title}</span> from your library?
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirm({ show: false, animeId: null, type: null, title: '' })} 
                                className="flex-1 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteConfirm} 
                                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all active:scale-95"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
