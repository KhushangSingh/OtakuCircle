import { useEffect, useState } from 'react';
import WatchStatusDropdown from '../components/WatchStatusDropdown';
import OttLogo from '../components/OttLogo';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Plus, Star, Play, Info, Calendar, Clock, Check, 
    ArrowLeft, Share2, X, Send, ExternalLink, Tv, 
    BookOpen, Users, Sparkles, Film, Heart, TrendingUp, Compass, Globe 
} from '../components/icons';

import { useNotification } from '../components/NotificationProvider';
import { useMediaStatus } from '../contexts/MediaStatusContext';

const AnimeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { animeStatuses, animeWatchlist, setAnimeStatus, setAnimeInWatchlist } = useMediaStatus();
    const [anime, setAnime] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    // Trailer Modal State
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);

    // Live Airing Countdown State
    const [countdown, setCountdown] = useState(null);

    // Thematic Tags State
    const [showSpoilerTags, setShowSpoilerTags] = useState(false);

    // Recommendation Modal State
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [friends, setFriends] = useState([]);
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const [singleFriendBlockedNotice, setSingleFriendBlockedNotice] = useState(null);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [recMessage, setRecMessage] = useState('');
    const [sending, setSending] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // --- FETCH DETAILS ---
    useEffect(() => {
        let isMounted = true;
        const fetchDetails = async () => {
            setLoadingDetails(true);
            try {
                const res = await axios.get(`${API_URL}/anime/${id}`);
                if (isMounted) {
                    setAnime(res.data);
                }
            } catch (error) {
                console.error("Failed to load anime details", error);
                if (isMounted) {
                    showNotification("Failed to load title details", "error");
                }
            } finally {
                if (isMounted) {
                    setLoadingDetails(false);
                }
            }
        };
        fetchDetails();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return () => { isMounted = false; };
    }, [id, API_URL]);

    // --- LIVE AIRING COUNTDOWN HOOK ---
    useEffect(() => {
        if (!anime?.nextAiringEpisode?.airingAt) {
            setCountdown(null);
            return;
        }

        const targetTime = anime.nextAiringEpisode.airingAt * 1000;

        const updateTimer = () => {
            const now = Date.now();
            const difference = targetTime - now;

            if (difference <= 0) {
                setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true });
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setCountdown({ days, hours, minutes, seconds, isLive: false });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [anime?.nextAiringEpisode]);

    // --- HANDLERS ---
    const handleAddToList = async () => {
        if (!anime) return;
        const currentStatus = animeStatuses[anime.mal_id];
        if (currentStatus && !window.confirm(`This title is marked as ${currentStatus}. Add it to your Watchlist instead? It will be removed from your watch history.`)) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            if (!token) { showNotification("Please sign in to add to your watchlist", "error"); navigate('/login'); return; }
            await axios.post(`${API_URL}/anime/watchlist`, 
                { 
                    animeId: anime.mal_id, 
                    title: anime.title, 
                    poster: anime.poster_url 
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("Added to Watchlist", "success");
            setAnimeInWatchlist(anime.mal_id);
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add", "error");
        }
    };

    const handleMarkWatched = async (statusValue = 'Watched') => {
        if (!anime) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) { showNotification("Please sign in to track your watch history", "error"); navigate('/login'); return; }
            await axios.post(`${API_URL}/anime/watchhistory`, 
                { 
                    animeId: anime.mal_id, 
                    title: anime.title, 
                    poster: anime.poster_url,
                    status: statusValue
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification(`Marked as ${statusValue}`, "success");
            setAnimeStatus(anime.mal_id, statusValue);
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update", "error");
        }
    };

    const handleWatchTrailer = () => {
        if (anime?.trailer_embed) {
            setIsTrailerOpen(true);
        } else if (anime?.trailer_url) {
            window.open(anime.trailer_url, '_blank', 'noopener,noreferrer');
        } else {
            showNotification("No official trailer available for this title", "error");
        }
    };

    // --- RECOMMENDATION LOGIC ---
    const isManga = (anime?.type || '').toLowerCase().includes('manga') || 
                    (anime?.type || '').toLowerCase().includes('manhwa') || 
                    (anime?.mediaType || '').toLowerCase() === 'manga';

    const completedStatus = isManga ? 'Read' : 'Watched';
    const completedVerb = isManga ? 'read this manga' : 'watched this anime';

    const isFriendCompleted = (friend) => {
        if (!friend.watchhistory || !Array.isArray(friend.watchhistory) || !anime) return false;
        return friend.watchhistory.some(item => 
            Number(item.animeId) === Number(anime.mal_id) && item.status === completedStatus
        );
    };

    const eligibleFriends = friends.filter(friend => !isFriendCompleted(friend));
    const selectedEligibleIds = selectedFriendIds.filter(id => 
        eligibleFriends.some(f => f._id === id)
    );

    const openRecModal = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification("Please sign in to recommend titles to friends", "error");
            navigate('/login');
            return;
        }

        setIsRecModalOpen(true);
        setSelectedFriendIds([]);
        setSingleFriendBlockedNotice(null);
        setLoadingFriends(true);

        try {
            const res = await axios.get(`${API_URL}/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const friendsList = res.data?.friends || (Array.isArray(res.data) ? res.data : []);
            setFriends(friendsList);
        } catch (error) {
            showNotification("Could not load friends list", "error");
        } finally {
            setLoadingFriends(false);
        }
    };

    const handleFriendClick = (friend) => {
        if (isFriendCompleted(friend)) {
            setSingleFriendBlockedNotice(friend);
            return;
        }

        setSingleFriendBlockedNotice(null);
        setSelectedFriendIds(prev => {
            if (prev.includes(friend._id)) {
                return prev.filter(id => id !== friend._id);
            } else {
                return [...prev, friend._id];
            }
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedEligibleIds.length === eligibleFriends.length) {
            setSelectedFriendIds([]);
        } else {
            setSelectedFriendIds(eligibleFriends.map(f => f._id));
        }
    };

    const handleSendRecommendation = async () => {
        if (selectedEligibleIds.length === 0) {
            showNotification("Please select at least one eligible friend", "error");
            return;
        }

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/social/recommend`, {
                recipientIds: selectedEligibleIds,
                animeId: Number(anime.mal_id),
                title: anime.title,
                poster: anime.poster_url,
                note: recMessage.trim(),
                mediaType: isManga ? 'manga' : 'anime',
                type: anime.type
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            showNotification(res.data.message || `Sent recommendation to ${selectedEligibleIds.length} friend(s)!`, "success");
            setIsRecModalOpen(false);
            setRecMessage('');
            setSelectedFriendIds([]);
            setSingleFriendBlockedNotice(null);
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to send recommendation", "error");
        } finally {
            setSending(false);
        }
    };

    // Calculate maximum score amount for rating distribution bars
    const maxScoreAmount = anime?.scoreDistribution?.length
        ? Math.max(...anime.scoreDistribution.map(s => s.amount || 0), 1)
        : 1;

    // Calculate total users across status distribution
    const totalStatusUsers = anime?.statusDistribution?.length
        ? anime.statusDistribution.reduce((acc, curr) => acc + (curr.amount || 0), 0)
        : 0;

    // Country Code to Name formatter
    const formatCountry = (code) => {
        const map = { JP: 'Japan', KR: 'South Korea', CN: 'China', US: 'United States', TW: 'Taiwan' };
        return map[code] || code || 'Japan';
    };

    if (loadingDetails || !anime) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <span className="text-zinc-400 font-medium text-sm tracking-wide">Loading detailed information...</span>
            </div>
        </div>
    );

    const visibleTags = (anime.tags || []).filter(t => showSpoilerTags || !t.isMediaSpoiler);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20 relative pt-20 pb-28 overflow-x-clip">
            
            {/* BACKGROUND POSTER LAYER WITH BLUR & GRADIENT DESIGN */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0a]">
                <img 
                    src={anime.poster_url} 
                    alt="Background Poster" 
                    className="absolute right-0 top-0 w-full lg:w-4/5 h-[900px] lg:h-[1050px] object-cover opacity-65 blur-[6px] scale-105 transition-opacity duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-[#0a0a0a]/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#0a0a0a]/80 to-transparent" />
            </div>

            <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
                
                {/* TOP NAVIGATION, LIVE COUNTDOWN & BADGES */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 rounded-full text-white text-xs sm:text-sm font-semibold transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* 1. LIVE NEXT EPISODE AIRING COUNTDOWN */}
                        {anime.nextAiringEpisode && (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs font-bold shadow-md shadow-amber-950/30">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                                <span>
                                    Ep {anime.nextAiringEpisode.episode} Airing in:{' '}
                                    {countdown ? (
                                        countdown.isLive ? (
                                            <span className="text-emerald-400 font-extrabold uppercase tracking-wide">Airing Now</span>
                                        ) : (
                                            <span className="font-mono font-extrabold text-white">
                                                {countdown.days > 0 && `${countdown.days}d `}
                                                {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                                            </span>
                                        )
                                    ) : (
                                        'Calculating...'
                                    )}
                                </span>
                            </div>
                        )}

                        <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-white/10 border border-white/10 text-zinc-300">
                            {anime.type || 'TV'}
                        </span>
                        {anime.status && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                {anime.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* HERO SECTION: POSTER + CORE INFO (Vertically Centered in Viewport & Wider Layout) */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 xl:gap-16 items-start mb-16 min-h-[calc(100vh-8.5rem)]">
                    
                    {/* Left: Poster Card (Vertically Centered in Visible Viewport) */}
                    <div className="w-full sm:w-[280px] lg:w-[320px] xl:w-[340px] shrink-0 mx-auto lg:mx-0 self-stretch">
                        <div className="lg:sticky lg:top-[max(5.5rem,calc(50vh-220px))] lg:mt-[max(0px,calc(50vh-340px))] flex justify-center transition-all duration-300">
                            <div className="relative w-full max-w-[280px] lg:max-w-[320px] xl:max-w-[340px] rounded-[2rem] overflow-hidden border border-white/15 bg-white/5 shadow-2xl shadow-black/80 aspect-[2/3] max-h-[calc(100vh-10rem)]">
                                <img 
                                    src={anime.poster_url} 
                                    alt={anime.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                                />
                                {anime.score && anime.score !== 'N/A' && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/20 shadow-lg text-sm font-bold">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        <span>{anime.score}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Title, Metadata & Action Suite */}
                    <div className="flex-1 flex flex-col justify-between w-full">
                        <div>
                            {/* Native / Alternate Title */}
                            {(anime.title_native || anime.title_romaji) && (
                                <p className="text-xs sm:text-sm text-zinc-400 font-medium mb-1 tracking-wider uppercase">
                                    {anime.title_native || anime.title_romaji}
                                </p>
                            )}

                            {/* Main Title */}
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
                                {anime.title}
                            </h1>

                            {/* Genres Pill Bar */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {anime.genres && anime.genres.map((g, i) => (
                                    <span 
                                        key={i} 
                                        className="rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-md px-3 py-1 text-xs font-semibold text-zinc-200"
                                    >
                                        {typeof g === 'string' ? g : g.name}
                                    </span>
                                ))}
                            </div>

                            {/* 6. EXPANDED DETAILED SOURCE, ORIGIN & METADATA GRID */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl mb-6 text-xs sm:text-sm">
                                <div>
                                    <span className="block text-zinc-400 text-[11px] uppercase font-bold tracking-wider mb-0.5">
                                        {isManga ? 'Format' : 'Episodes'}
                                    </span>
                                    <span className="font-semibold text-white">
                                        {isManga ? (anime.chapters ? `${anime.chapters} Chapters` : 'Manga') : (anime.episodes ? `${anime.episodes} Ep (${anime.duration})` : anime.duration || 'TV Series')}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-zinc-400 text-[11px] uppercase font-bold tracking-wider mb-0.5">
                                        Airing Season
                                    </span>
                                    <span className="font-semibold text-white">
                                        {anime.season || anime.year || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-zinc-400 text-[11px] uppercase font-bold tracking-wider mb-0.5">
                                        {isManga ? 'Author / Staff' : 'Studio'}
                                    </span>
                                    <span className="font-semibold text-white truncate block">
                                        {anime.studios && anime.studios.length > 0 
                                            ? anime.studios.map(s => s.name).join(', ') 
                                            : anime.staff && anime.staff.length > 0 
                                            ? anime.staff[0].name 
                                            : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-zinc-400 text-[11px] uppercase font-bold tracking-wider mb-0.5">
                                        Source Material
                                    </span>
                                    <span className="font-semibold text-white">
                                        {anime.source || 'Original'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-zinc-400 text-[11px] uppercase font-bold tracking-wider mb-0.5">
                                        Origin &amp; Rating
                                    </span>
                                    <span className="font-semibold text-white truncate block">
                                        {formatCountry(anime.countryOfOrigin)} • {anime.contentRating || 'PG-13'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-zinc-400 text-[11px] uppercase font-bold tracking-wider mb-0.5">
                                        Community
                                    </span>
                                    <span className="font-semibold text-white">
                                        {anime.popularity ? `${Number(anime.popularity).toLocaleString()} fans` : 'Trending'}
                                    </span>
                                </div>
                            </div>

                            {/* Interactive Action Suite */}
                            <div className="flex flex-wrap items-center gap-3 mb-8">
                                {(anime.trailer_embed || anime.trailer_url) && (
                                    <button 
                                        onClick={handleWatchTrailer} 
                                        className="h-11 flex items-center gap-2 bg-white text-black px-5 rounded-full font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                                    >
                                        <Play className="w-4 h-4 fill-black" />
                                        <span>Official Trailer</span>
                                    </button>
                                )}

                                <button 
                                    onClick={handleAddToList} 
                                    disabled={Boolean(animeWatchlist[anime.mal_id])} 
                                    className={`h-11 flex items-center gap-2 backdrop-blur-xl px-5 rounded-full font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer ${
                                        animeWatchlist[anime.mal_id] 
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 cursor-default' 
                                            : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                                    }`}
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>{animeWatchlist[anime.mal_id] ? 'In Watchlist' : 'Watchlist'}</span>
                                </button>
                                
                                <WatchStatusDropdown 
                                    currentStatus={animeStatuses[anime.mal_id]}
                                    onStatusChange={(status) => handleMarkWatched(status)}
                                    wrapperClass="w-36 shrink-0"
                                    className="h-11 rounded-full"
                                />

                                <button
                                    onClick={openRecModal}
                                    className="h-11 flex items-center gap-2 bg-purple-500/15 text-purple-200 border border-purple-500/30 px-5 rounded-full font-bold text-xs sm:text-sm hover:bg-purple-500/25 transition-all active:scale-95 cursor-pointer"
                                >
                                    <Share2 className="w-4 h-4" />
                                    <span>Recommend</span>
                                </button>
                            </div>
                        </div>

                        {/* Synopsis */}
                        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-7">
                            <h2 className="text-base sm:text-lg font-bold text-white mb-2">
                                Synopsis
                            </h2>
                            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-light">
                                {anime.synopsis}
                            </p>

                            {/* Airing Timeline Footer */}
                            {(anime.startDate || anime.endDate) && (
                                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-6 text-xs text-zinc-400 font-medium">
                                    {anime.startDate && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-white/60" />
                                            <span>Premiered: <strong className="text-white">{anime.startDate}</strong></span>
                                        </div>
                                    )}
                                    {anime.endDate && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-white/60" />
                                            <span>Ended: <strong className="text-white">{anime.endDate}</strong></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 7. EXTERNAL LINKS & OFFICIAL SOCIALS HUB */}
                        {anime.officialSocials && anime.officialSocials.length > 0 && (
                            <div className="mt-5 flex flex-wrap items-center gap-2.5">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1">
                                    Official Links:
                                </span>
                                {anime.officialSocials.map((link) => (
                                    <a
                                        key={link.id || link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer backdrop-blur-md"
                                    >
                                        <Globe size={13} className="text-zinc-400" />
                                        <span>{link.site}</span>
                                        <ExternalLink size={12} className="opacity-60" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* WHERE TO WATCH / WHERE TO READ SECTION */}
                {anime.streamingPlatforms && anime.streamingPlatforms.length > 0 && (
                    <div className="mb-14">
                        <div className="flex items-center gap-2 mb-4">
                            <Tv className="text-blue-400" size={20} />
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                {isManga ? 'Where to Read' : 'Where to Watch'}
                            </h2>
                            <span className="text-xs text-zinc-400 ml-2 font-medium">Official &amp; Licensed Platforms</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {anime.streamingPlatforms.map((platform) => (
                                <a
                                    key={platform.id || platform.site}
                                    href={platform.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/20 transition-all group backdrop-blur-xl cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <OttLogo site={platform.site} iconUrl={platform.icon} className="w-8 h-8" />
                                        <span className="text-sm font-semibold text-white truncate">
                                            {platform.site}
                                        </span>
                                    </div>
                                    <ExternalLink size={15} className="text-zinc-400 group-hover:text-white transition-colors shrink-0 ml-2" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* EMBEDDED OFFICIAL TRAILER SECTION */}
                {anime.trailer_embed && (
                    <div className="mb-14">
                        <div className="flex items-center gap-2 mb-4">
                            <Play className="text-red-400" size={20} />
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Official Trailer
                            </h2>
                        </div>

                        <div className="w-full max-w-4xl mx-auto rounded-[2rem] overflow-hidden border border-white/15 bg-black/60 shadow-2xl aspect-video">
                            <iframe
                                src={anime.trailer_embed}
                                title={`${anime.title} Official Trailer`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* CAST & CHARACTERS SECTION */}
                {anime.characters && anime.characters.length > 0 && (
                    <div className="mb-14">
                        <div className="flex items-center gap-2 mb-5">
                            <Users className="text-purple-400" size={20} />
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Characters &amp; Voice Cast
                            </h2>
                            <span className="text-xs text-zinc-400 ml-2 font-medium">Main &amp; Supporting</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {anime.characters.map((char) => (
                                <div 
                                    key={char.id}
                                    className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all hover:bg-white/[0.07] hover:border-white/20"
                                >
                                    {/* Character Info */}
                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                                            {char.image ? (
                                                <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">?</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{char.name}</p>
                                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 ${
                                                char.role === 'MAIN' 
                                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                                    : 'bg-white/5 text-zinc-400 border border-white/5'
                                            }`}>
                                                {char.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Japanese Voice Actor */}
                                    {char.voiceActor && (
                                        <div className="flex items-center gap-2.5 text-right shrink-0 pl-2 border-l border-white/10">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-xs text-zinc-200 truncate max-w-[90px] sm:max-w-[110px]">
                                                    {char.voiceActor.name}
                                                </p>
                                                <span className="text-[10px] text-zinc-400 uppercase font-medium">Japanese VA</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                                                {char.voiceActor.image ? (
                                                    <img src={char.voiceActor.image} alt={char.voiceActor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">VA</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. COMMUNITY SCORE & STATUS DISTRIBUTION SECTION */}
                {((anime.scoreDistribution && anime.scoreDistribution.length > 0) || (anime.statusDistribution && anime.statusDistribution.length > 0)) && (
                    <div className="mb-14">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="text-emerald-400" size={20} />
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Community Ratings &amp; Activity
                            </h2>
                            <span className="text-xs text-zinc-400 ml-2 font-medium">Global Member Analytics</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Score Distribution Chart */}
                            {anime.scoreDistribution && anime.scoreDistribution.length > 0 && (
                                <div className="p-6 rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                            Score Breakdown
                                        </h3>
                                        <span className="text-xs text-zinc-400">
                                            Average: <strong className="text-white">{anime.score || 'N/A'}</strong> ★
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {anime.scoreDistribution.slice().reverse().map((item) => {
                                            const percentage = ((item.amount / maxScoreAmount) * 100).toFixed(0);
                                            const starLabel = item.score / 10;
                                            return (
                                                <div key={item.score} className="flex items-center gap-3 text-xs">
                                                    <span className="w-9 font-bold text-zinc-300 text-right shrink-0">
                                                        {starLabel} ★
                                                    </span>
                                                    <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" 
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-16 font-mono text-[11px] text-zinc-400 text-right shrink-0">
                                                        {Number(item.amount).toLocaleString()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Status Distribution */}
                            {anime.statusDistribution && anime.statusDistribution.length > 0 && (
                                <div className="p-6 rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                                Watch Status Breakdown
                                            </h3>
                                            <span className="text-xs text-zinc-400">
                                                Total Trackers: <strong className="text-white">{totalStatusUsers.toLocaleString()}</strong>
                                            </span>
                                        </div>

                                        {/* Multi-segment Progress Bar */}
                                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-white/5 mb-6">
                                            {anime.statusDistribution.map((item) => {
                                                const pct = totalStatusUsers ? (item.amount / totalStatusUsers) * 100 : 0;
                                                const colorMap = {
                                                    CURRENT: 'bg-blue-500',
                                                    COMPLETED: 'bg-emerald-500',
                                                    PLANNING: 'bg-purple-500',
                                                    PAUSED: 'bg-amber-500',
                                                    DROPPED: 'bg-red-500'
                                                };
                                                return (
                                                    <div 
                                                        key={item.status} 
                                                        style={{ width: `${pct}%` }} 
                                                        className={`${colorMap[item.status] || 'bg-zinc-500'} h-full transition-all`}
                                                        title={`${item.status}: ${item.amount.toLocaleString()} (${pct.toFixed(1)}%)`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Status Cards Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {anime.statusDistribution.map((item) => {
                                            const labelMap = {
                                                CURRENT: isManga ? 'Reading' : 'Watching',
                                                COMPLETED: 'Completed',
                                                PLANNING: 'Plan to Watch',
                                                PAUSED: 'On Hold',
                                                DROPPED: 'Dropped'
                                            };
                                            const dotColor = {
                                                CURRENT: 'bg-blue-400',
                                                COMPLETED: 'bg-emerald-400',
                                                PLANNING: 'bg-purple-400',
                                                PAUSED: 'bg-amber-400',
                                                DROPPED: 'bg-red-400'
                                            };
                                            const pct = totalStatusUsers ? ((item.amount / totalStatusUsers) * 100).toFixed(1) : 0;
                                            return (
                                                <div key={item.status} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className={`w-2 h-2 rounded-full ${dotColor[item.status] || 'bg-zinc-400'}`} />
                                                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide">
                                                            {labelMap[item.status] || item.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-extrabold text-white">
                                                        {Number(item.amount).toLocaleString()}
                                                    </p>
                                                    <span className="text-[10px] text-zinc-400 font-mono">
                                                        {pct}% of members
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. THEMATIC TAGS WITH COMMUNITY UPVOTES */}
                {visibleTags.length > 0 && (
                    <div className="mb-14">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Compass className="text-cyan-400" size={20} />
                                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                    Thematic Tags &amp; Tropes
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSpoilerTags(!showSpoilerTags)}
                                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                                    showSpoilerTags 
                                        ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                                        : 'bg-white/5 text-zinc-400 hover:text-white border-white/10'
                                }`}
                            >
                                {showSpoilerTags ? 'Hide Spoilers' : 'Show Spoiler Tags'}
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                            {visibleTags.map((tag) => (
                                <div 
                                    key={tag.id}
                                    title={tag.description || tag.name}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                                        tag.isMediaSpoiler 
                                            ? 'bg-red-500/10 border-red-500/25 text-red-200' 
                                            : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-zinc-200'
                                    }`}
                                >
                                    <span className="font-semibold">{tag.name}</span>
                                    {tag.rank !== undefined && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 font-bold">
                                            {tag.rank}%
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. THEME SONGS (OPENINGS & ENDINGS) */}
                {anime.themes && (anime.themes.openings?.length > 0 || anime.themes.endings?.length > 0) && (
                    <div className="mb-14">
                        <div className="flex items-center gap-2 mb-4">
                            <Film className="text-pink-400" size={20} />
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Theme Songs
                            </h2>
                            <span className="text-xs text-zinc-400 ml-2 font-medium">Opening &amp; Ending Themes</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Openings */}
                            {anime.themes.openings?.length > 0 && (
                                <div className="p-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                                        Opening Themes ({anime.themes.openings.length})
                                    </h3>
                                    <ul className="space-y-2 text-xs text-zinc-300 font-medium">
                                        {anime.themes.openings.map((op, idx) => (
                                            <li key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 leading-relaxed">
                                                {op}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Endings */}
                            {anime.themes.endings?.length > 0 && (
                                <div className="p-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                                        Ending Themes ({anime.themes.endings.length})
                                    </h3>
                                    <ul className="space-y-2 text-xs text-zinc-300 font-medium">
                                        {anime.themes.endings.map((ed, idx) => (
                                            <li key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 leading-relaxed">
                                                {ed}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. COMMUNITY RECOMMENDATIONS ("MORE LIKE THIS") */}
                {anime.communityRecommendations && anime.communityRecommendations.length > 0 && (
                    <div className="mb-14">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Heart className="text-rose-400" size={20} />
                                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                    More Like This
                                </h2>
                                <span className="text-xs text-zinc-400 ml-2 font-medium">Community Suggestions</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {anime.communityRecommendations.map((rec) => (
                                <div
                                    key={rec.mal_id}
                                    onClick={() => navigate(`/anime/${rec.mal_id}`)}
                                    className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col p-2.5"
                                >
                                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 mb-2">
                                        <img 
                                            src={rec.poster_url} 
                                            alt={rec.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                        {rec.score && (
                                            <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white border border-white/10">
                                                ★ {rec.score}
                                            </div>
                                        )}
                                        {rec.upvotes > 0 && (
                                            <div className="absolute bottom-2 left-2 bg-rose-600/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white">
                                                ▲ {rec.upvotes}
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-bold text-xs text-white line-clamp-2 mb-0.5 group-hover:text-blue-300 transition-colors">
                                        {rec.title}
                                    </p>
                                    <span className="text-[10px] text-zinc-400 uppercase font-medium">
                                        {rec.format || rec.type}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FRANCHISE & RELATED TITLES SECTION */}
                {anime.relations && anime.relations.length > 0 && (
                    <div className="mb-14">
                        <div className="flex items-center gap-2 mb-5">
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Franchise &amp; Related Titles
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {anime.relations.map((rel, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => navigate(`/anime/${rel.mal_id}`)}
                                    className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col p-2.5"
                                >
                                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 mb-2">
                                        <img 
                                            src={rel.poster_url} 
                                            alt={rel.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase border border-white/10">
                                            {rel.relationType?.replace(/_/g, ' ')}
                                        </div>
                                        {rel.score && (
                                            <div className="absolute bottom-2 right-2 bg-blue-500/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white">
                                                ★ {rel.score}
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-bold text-xs text-white line-clamp-2 mb-0.5 group-hover:text-blue-300 transition-colors">
                                        {rel.title}
                                    </p>
                                    <span className="text-[10px] text-zinc-400 uppercase font-medium">
                                        {rel.format || rel.type}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* TRAILER POPUP MODAL */}
            {isTrailerOpen && anime.trailer_embed && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={() => setIsTrailerOpen(false)}
                >
                    <div 
                        className="relative w-full max-w-4xl bg-black border border-white/20 rounded-[2rem] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10">
                            <span className="font-bold text-white text-sm sm:text-base truncate pr-4">
                                {anime.title} — Official Trailer
                            </span>
                            <button
                                onClick={() => setIsTrailerOpen(false)}
                                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="aspect-video w-full">
                            <iframe
                                src={`${anime.trailer_embed}?autoplay=1`}
                                title={`${anime.title} Official Trailer`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* RECOMMENDATION MODAL */}
            {isRecModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="font-bold text-white text-base">
                                    Recommend {isManga ? 'Manga' : 'Anime'}
                                </h3>
                                <p className="text-xs text-zinc-400 truncate max-w-xs">{anime.title}</p>
                            </div>
                            <button 
                                onClick={() => setIsRecModalOpen(false)} 
                                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            {loadingFriends ? (
                                <div className="py-12 text-center text-zinc-500 text-sm">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    Loading your friends...
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="py-12 text-center text-zinc-400 text-sm">
                                    <p className="font-semibold text-white mb-1">No friends added yet</p>
                                    <p className="text-xs text-zinc-500">Add fellow otakus from the Social Hub to start sharing recommendations!</p>
                                </div>
                            ) : (
                                <>
                                    {/* Friend Selection Header & Controls */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                            Select Recipients ({selectedEligibleIds.length}/{eligibleFriends.length} eligible)
                                        </p>
                                        {eligibleFriends.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={handleToggleSelectAll}
                                                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
                                            >
                                                {selectedEligibleIds.length === eligibleFriends.length ? 'Deselect All' : 'Select All Eligible'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Single friend blocked state */}
                                    {singleFriendBlockedNotice && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-left animate-in fade-in duration-200">
                                            <p className="text-sm font-bold text-red-400">Recommendation unavailable</p>
                                            <p className="text-xs text-zinc-200 mt-1 font-medium">This friend has already {completedVerb}.</p>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">The recommendation cannot be sent to this friend.</p>
                                        </div>
                                    )}

                                    {/* All friends completed state */}
                                    {eligibleFriends.length === 0 && !singleFriendBlockedNotice && (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left animate-in fade-in duration-200">
                                            <p className="text-sm font-bold text-amber-400">Recommendation unavailable</p>
                                            <p className="text-xs text-zinc-200 mt-1 font-medium">All of your friends have already {completedVerb}.</p>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">Recommendations can only be sent to friends who haven't completed this title.</p>
                                        </div>
                                    )}

                                    {/* Friends List */}
                                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                        {friends.map(friend => {
                                            const completed = isFriendCompleted(friend);
                                            const isSelected = selectedFriendIds.includes(friend._id);

                                            return (
                                                <div 
                                                    key={friend._id}
                                                    onClick={() => handleFriendClick(friend)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                                        completed
                                                            ? 'bg-white/[0.02] border-white/5 opacity-60 cursor-not-allowed'
                                                            : isSelected
                                                            ? 'bg-blue-500/15 border-blue-500/40 text-white cursor-pointer shadow-sm'
                                                            : 'bg-white/[0.04] border-white/5 hover:bg-white/[0.08] hover:border-white/10 text-zinc-300 cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                                                            {friend.profilePicture ? (
                                                                <img src={friend.profilePicture} alt={friend.username} className="w-full h-full object-cover"/>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                                                                    {friend.username?.[0]?.toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm truncate text-white">{friend.username}</p>
                                                        </div>
                                                    </div>

                                                    {/* Status indicator / already watched message */}
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        {completed ? (
                                                            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                                {isManga ? 'This friend has already read this manga.' : 'This friend has already watched this anime.'}
                                                            </span>
                                                        ) : (
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-blue-500 border-blue-400 text-white' 
                                                                    : 'border-white/20 bg-black/20'
                                                            }`}>
                                                                {isSelected && (
                                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Personal Message */}
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                                            Note for recipients <span className="text-zinc-500 font-normal">(optional)</span>
                                        </label>
                                        <textarea
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 resize-none h-20 transition"
                                            placeholder="Why do you recommend this title? [Max 100 chars]"
                                            value={recMessage}
                                            onChange={(e) => setRecMessage(e.target.value)}
                                            maxLength={100}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {friends.length > 0 && !loadingFriends && (
                            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                                <button 
                                    onClick={handleSendRecommendation}
                                    disabled={sending || selectedEligibleIds.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-98 text-sm"
                                >
                                    {sending 
                                        ? 'Sending...' 
                                        : selectedEligibleIds.length === 0
                                        ? (eligibleFriends.length === 0 ? 'No eligible recipients' : 'Select at least one eligible friend')
                                        : `Send Recommendation (${selectedEligibleIds.length})`
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AnimeDetails;
