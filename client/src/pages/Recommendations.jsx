import { useEffect, useState, useCallback } from 'react';
import WatchStatusDropdown from '../components/WatchStatusDropdown';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Tv, Star, Check, Sparkles, RefreshCw, X, 
    ArrowRight, Compass, Info 
} from '../components/icons';
import { useNotification } from '../components/NotificationProvider';
import { useMediaStatus } from '../contexts/MediaStatusContext';
import { getValidToken, clearAuth } from '../utils/auth';
import heroImage from '../assets/spotlight-hero-bg-converted.webp';

// --- ANIME CARD COMPONENT ---
// Reuses the site-wide AnimeCard design from Home & Smart Search,
// adding dismissal ('X') and AI explanation needed for the For You page.
const AnimeCard = ({ anime, onAddWatchlist, onAddWatchhistory, onDismiss, onClick }) => {
    const { animeStatuses, animeWatchlist, setAnimeStatus, setAnimeInWatchlist } = useMediaStatus();
    const currentStatus = animeStatuses[anime.mal_id];
    const watchlistAdded = Boolean(animeWatchlist[anime.mal_id]);

    return (
        <div 
            className="group relative w-full max-w-[200px] cursor-pointer perspective-1000 mx-auto"
            onClick={onClick}
        >
            <div 
                className="relative aspect-[2/3] rounded-2xl bg-zinc-900 transition-all duration-500 ease-out 
                transform-gpu backface-hidden
                group-hover:scale-105 
                group-hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.25)] 
                border border-white/5 group-hover:border-white/20"
                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <img 
                        src={anime.poster_url || 'https://via.placeholder.com/200x300?text=No+Image'} 
                        alt={anime.title} 
                        className="w-full h-full rounded-2xl object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Standard Score Badge */}
                {anime.score && (
                    <div className="absolute top-3 right-3 bg-blue-500/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-400 shadow-lg shadow-blue-900/40 z-10">
                        ★ {Number(anime.score).toFixed(2)}
                    </div>
                )}

                {/* Dismiss Recommendation Button */}
                {onDismiss && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(anime.mal_id, anime.title);
                        }}
                        title="Dismiss suggestion"
                        className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/75 hover:bg-red-500/80 text-zinc-400 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 hover:border-red-400/50 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer shadow-lg active:scale-90"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* Hover Actions Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-2 z-20">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (currentStatus && !window.confirm(`This anime is marked as ${currentStatus}. Add it to your Watchlist instead? It will be removed from your watch history.`)) return;
                            Promise.resolve(onAddWatchlist(anime)).then((success) => {
                                if (success) setAnimeInWatchlist(anime.mal_id);
                            });
                        }}
                        disabled={watchlistAdded}
                        className={`w-[85%] mx-auto flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold backdrop-blur-sm border transition-colors active:scale-95 shadow-lg
                            ${watchlistAdded 
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' 
                                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>{watchlistAdded ? 'In Watchlist' : 'Watchlist'}</span>
                    </button>

                    <WatchStatusDropdown 
                        currentStatus={currentStatus}
                        onStatusChange={(status) => {
                            Promise.resolve(onAddWatchhistory(anime, status)).then((success) => {
                                if (success) setAnimeStatus(anime.mal_id, status);
                            });
                        }}
                        wrapperClass="w-[85%] mx-auto"
                        className="rounded-full"
                        direction="up"
                    />
                </div>
            </div>

            {/* Title & Metadata */}
            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-60">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-100 truncate leading-tight">
                    {anime.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    <span>{anime.type || 'TV'}</span>
                    {anime.year && <span>• {anime.year}</span>}
                </div>
                {anime.explanation && (
                    <p className="text-[11px] text-blue-400 font-medium truncate pt-0.5" title={anime.explanation}>
                        {anime.explanation}
                    </p>
                )}
            </div>
        </div>
    );
};

// --- MAIN RECOMMENDATIONS PAGE ---
const Recommendations = () => {
    const [recs, setRecs] = useState([]);
    const [metaInfo, setMetaInfo] = useState({ hasHistory: true, historyCount: 0, topGenres: [] });
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [undidDismissId, setUndidDismissId] = useState(null);

    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const fetchRecs = useCallback(async (forceRefresh = false) => {
        const token = getValidToken();
        if (!token) {
            setLoading(false);
            setRecs([]);
            setMetaInfo({
                hasHistory: false,
                historyCount: 0,
                topGenres: []
            });
            return; 
        }

        const cacheKey = `otakucircle-cache:recommendations:${token}`;

        if (!forceRefresh) {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const cachedEntry = JSON.parse(cached);
                    if (Date.now() - cachedEntry.createdAt < 3 * 60 * 1000) {
                        const payload = cachedEntry.data;
                        setRecs(payload.data || payload);
                        setMetaInfo({
                            hasHistory: payload.hasHistory ?? true,
                            historyCount: payload.historyCount || 0,
                            topGenres: payload.topGenres || []
                        });
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    sessionStorage.removeItem(cacheKey);
                }
            }
        }

        try {
            if (forceRefresh) setIsRefreshing(true);
            else setLoading(true);

            const response = await axios.get(`${API_URL}/recommendations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const payload = response.data;
            const recList = payload.data || payload;

            setRecs(Array.isArray(recList) ? recList : []);
            setMetaInfo({
                hasHistory: payload.hasHistory ?? (recList.length > 0),
                historyCount: payload.historyCount || 0,
                topGenres: payload.topGenres || []
            });

            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({ createdAt: Date.now(), data: payload }));
            } catch (cacheError) {
                // Ignore storage quota
            }

            if (forceRefresh) {
                showNotification("Refreshed with new suggestions!", "success");
            }
        } catch (error) {
            if (error.response?.status === 401) {
                clearAuth();
                setRecs([]);
                setMetaInfo({
                    hasHistory: false,
                    historyCount: 0,
                    topGenres: []
                });
                return;
            }
            console.error("Error fetching recommendations:", error);
            showNotification("Could not load recommendations", "error");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [API_URL, showNotification]);

    useEffect(() => {
        fetchRecs();
    }, [fetchRecs]);

    const handleCardClick = (id) => {
        navigate(`/anime/${id}`);
    };

    // Dismiss recommendation handler
    const handleDismissRecommendation = async (animeId, animeTitle) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Optimistically remove from state
        setRecs(prev => prev.filter(item => item.mal_id !== animeId));

        // Update sessionStorage cache
        const cacheKey = `otakucircle-cache:recommendations:${token}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.data?.data) {
                    parsed.data.data = parsed.data.data.filter(item => item.mal_id !== animeId);
                } else if (Array.isArray(parsed.data)) {
                    parsed.data = parsed.data.filter(item => item.mal_id !== animeId);
                }
                sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
            } catch (e) {}
        }

        try {
            await axios.post(`${API_URL}/recommendations/dismiss`, {
                animeId
            }, { headers: { Authorization: `Bearer ${token}` } });

            showNotification(`Dismissed "${animeTitle}". We won't show it again.`, "info");
        } catch (err) {
            console.error("Failed to dismiss recommendation:", err);
        }
    };

    const handleAddToWatchlist = async (animeOrEvent, maybeAnime) => {
        const anime = maybeAnime || animeOrEvent;
        if (animeOrEvent && animeOrEvent.stopPropagation) animeOrEvent.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification("Please login first", "error");
            return;
        }

        try {
            await axios.post(`${API_URL}/anime/watchlist`, {
                animeId: anime.mal_id, 
                title: anime.title, 
                poster: anime.poster_url
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            showNotification(`Added ${anime.title} to Watchlist`, "success");
            return true;
        } catch(err) {
            showNotification("Failed to add to watchlist", "error");
            return false;
        }
    };

    const handleAddToWatchhistory = async (anime, statusValue = 'Watched') => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await axios.post(`${API_URL}/anime/watchhistory`, {
                animeId: anime.mal_id, 
                title: anime.title, 
                poster: anime.poster_url, 
                status: statusValue
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Marked ${anime.title} as ${statusValue}`, "success");
            
            // If user had little/no history, refetching will now personalize!
            if (!metaInfo.hasHistory || metaInfo.historyCount < 3) {
                fetchRecs(true);
            }
            return true;
        } catch (error) { 
            showNotification("Failed to add to watched", "error");
            return false;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-zinc-400 font-medium tracking-widest text-xs uppercase animate-pulse">
                    Analyzing personal watch history & generating picks...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-28 pt-24 relative overflow-hidden">
            
            {/* --- HERO HEADER --- */}
            <div className="w-full px-4 lg:px-8 mb-8 relative z-10">
                <div className="relative p-6 sm:p-8 md:p-10 rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900/90 via-black to-zinc-950 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="relative z-20 max-w-3xl">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
                            Your Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">Discovery Feed</span>
                        </h1>

                        <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                            We've analyzed your watch history to find these hidden gems. The more you watch, the smarter we get.
                        </p>
                    </div>

                    {/* Action Controls */}
                    <div className="relative z-20 flex items-center gap-3 self-stretch md:self-auto justify-end">
                        <button
                            type="button"
                            onClick={() => fetchRecs(true)}
                            disabled={isRefreshing}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Suggestions'}</span>
                        </button>
                    </div>

                    {/* Decorative background image */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
                        <img src={heroImage} alt="" className="absolute right-0 top-0 w-[55%] h-full object-cover opacity-35" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent z-10" />
                    </div>
                </div>
            </div>

            {/* --- STARTER ONBOARDING BANNER (Avoids dead-end empty states) --- */}
            {!metaInfo.hasHistory && (
                <div className="w-full px-4 lg:px-8 mb-8 relative z-10">
                    <div className="rounded-2xl bg-blue-950/30 border border-blue-500/30 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-white">
                                Starter Profile: Mark what you've seen
                            </h3>
                            <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
                                Click <strong>"Watched"</strong> or <strong>"Watchlist"</strong> on any title below to immediately train your personalized AI feed.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/smart-search')}
                            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap self-stretch sm:self-auto"
                        >
                            Search by Scenario
                        </button>
                    </div>
                </div>
            )}

            {/* --- CONTENT GRID --- */}
            <div className="w-full px-4 lg:px-8 relative z-10">
                {recs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 text-center mx-auto max-w-xl backdrop-blur-sm p-6">
                        <h3 className="text-lg font-bold mb-2 text-white">No active suggestions</h3>
                        <p className="text-zinc-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
                            You may have dismissed recent suggestions or reached the end of the current queue. Click below to load a fresh set!
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button 
                                onClick={() => fetchRecs(true)} 
                                className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all cursor-pointer"
                            >
                                Reload Fresh Recommendations
                            </button>
                            <button 
                                onClick={() => navigate('/')} 
                                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border border-white/10"
                            >
                                Browse Trending
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                    Curated For You
                                </span>
                                <span className="text-xs text-zinc-400 font-medium">
                                    ({recs.length} titles)
                                </span>
                            </div>
                            <span className="text-xs text-zinc-500 hidden sm:inline-block">
                                Hover over a card and click × to dismiss recommendations that don't fit
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
                            {recs.map((anime) => (
                                <AnimeCard 
                                    key={anime.mal_id || anime._id} 
                                    anime={anime} 
                                    onAddWatchlist={handleAddToWatchlist}
                                    onAddWatchhistory={handleAddToWatchhistory}
                                    onDismiss={handleDismissRecommendation}
                                    onClick={() => handleCardClick(anime.mal_id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Recommendations;
