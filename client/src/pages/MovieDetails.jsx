import { useEffect, useState } from 'react';
import WatchStatusDropdown from '../components/WatchStatusDropdown';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Plus, Star, Play, Info, Calendar, Clock, Check, ArrowLeft,
    Share2, X, Send
} from '../components/icons';

import { useNotification } from '../components/NotificationProvider';
import { useMediaStatus } from '../contexts/MediaStatusContext';

const MovieDetails = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const { movieStatuses, movieWatchlist, setMovieStatus, setMovieInWatchlist } = useMediaStatus();

    // Modal State
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
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/movies/${type}/${id}`);
                setMovie(res.data);
            } catch (error) {
                console.error("Failed to load movie details");
                showNotification("Error loading details", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, type, API_URL]);

    // --- HANDLERS ---
    const handleAddToList = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification("Please sign in to add items to your watchlist.", "error");
                navigate('/login');
                return;
            }
            const currentStatus = movieStatuses[movie.tmdb_id];
            if (currentStatus && !window.confirm(`This title is marked as ${currentStatus}. Add it to your Watchlist instead? It will be removed from your watch history.`)) {
                return;
            }
            await axios.post(`${API_URL}/movies/watchlist`, 
                { 
                    tmdbId: movie.tmdb_id, 
                    title: movie.title, 
                    poster: movie.poster_url,
                    mediaType: movie.media_type
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("Added to Watchlist", "success");
            setMovieInWatchlist(movie.tmdb_id);
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add", "error");
        }
    };

    const handleMarkWatched = async (statusValue = 'Watched') => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/movies/watchhistory`, 
                { 
                    tmdbId: movie.tmdb_id, 
                    title: movie.title, 
                    poster: movie.poster_url,
                    mediaType: movie.media_type,
                    status: statusValue
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification(`Marked as ${statusValue}`, "success");
            setMovieStatus(movie.tmdb_id, statusValue);
            return true;
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update", "error");
            return false;
        }
    };

    const handleWatchTrailer = () => {
        if (movie.trailer_url) {
            window.open(movie.trailer_url, '_blank', 'noopener,noreferrer');
        } else {
            showNotification("Trailer not available", "error");
        }
    };

    // --- RECOMMENDATION LOGIC ---
    const isTV = (movie?.media_type || '').toLowerCase() === 'tv';
    const mediaNoun = isTV ? 'TV show' : 'movie';
    const completedVerb = isTV ? 'watched this show' : 'watched this movie';

    const isFriendCompleted = (friend) => {
        return (friend.completedMovieIds || []).includes(Number(movie?.tmdb_id));
    };

    const eligibleFriends = friends.filter(f => !isFriendCompleted(f));
    const selectedEligibleIds = selectedFriendIds.filter(id => {
        const friend = friends.find(f => f._id === id);
        return friend && !isFriendCompleted(friend);
    });

    const openRecModal = async () => {
        setIsRecModalOpen(true);
        setLoadingFriends(true);
        setSelectedFriendIds([]);
        setSingleFriendBlockedNotice(null);
        setRecMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data || []);
        } catch (error) {
            showNotification("Failed to load friends", "error");
        } finally {
            setLoadingFriends(false);
        }
    };

    const handleFriendClick = (friend) => {
        const completed = isFriendCompleted(friend);
        if (completed) {
            setSingleFriendBlockedNotice(friend.username);
            setSelectedFriendIds(prev => prev.filter(id => id !== friend._id));
            return;
        }

        setSingleFriendBlockedNotice(null);
        setSelectedFriendIds(prev => 
            prev.includes(friend._id) 
                ? prev.filter(id => id !== friend._id) 
                : [...prev, friend._id]
        );
    };

    const handleToggleSelectAll = () => {
        setSingleFriendBlockedNotice(null);
        if (selectedEligibleIds.length === eligibleFriends.length) {
            setSelectedFriendIds([]);
        } else {
            setSelectedFriendIds(eligibleFriends.map(f => f._id));
        }
    };

    const handleSendRecommendation = async () => {
        if (selectedEligibleIds.length === 0) return;
        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/social/recommend-movie`, {
                friendIds: selectedEligibleIds,
                tmdbId: movie.tmdb_id,
                title: movie.title,
                poster: movie.poster_url,
                mediaType: movie.media_type || (isTV ? 'tv' : 'movie'),
                message: recMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            showNotification(res.data.message || `Sent recommendation to ${selectedEligibleIds.length} friend(s)!`, "success");
            setIsRecModalOpen(false);
            setRecMessage('');
            setSelectedFriendIds([]);
            setSingleFriendBlockedNotice(null);
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to send", "error");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Details not found</h1>
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen lg:h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20 relative pt-16 pb-8 flex flex-col justify-center overflow-y-auto lg:overflow-hidden">
            
            {/* BACK BUTTON */}
            <button 
                onClick={() => navigate(-1)}
            className="absolute top-20 left-6 lg:left-12 z-50 p-2 lg:p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white transition-colors shadow-xl"
            >
                <ArrowLeft size={20} />
            </button>

            {/* BACKGROUND POSTER LAYER */}
            <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
                <img 
                    src={movie.backdrop_url || movie.poster_url} 
                    alt="Background" 
                    className="absolute right-0 top-0 w-full lg:w-4/5 h-full object-cover opacity-65 blur-[6px] scale-105 transition-opacity duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-[#0a0a0a]/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
            </div>

            {/* MAIN CONTENT */}
            <div className="relative z-10 w-full px-4 lg:px-8 flex flex-col md:flex-row gap-10 lg:gap-16 items-center justify-center h-full">
                
                {/* Poster */}
                <div className="w-[160px] sm:w-[200px] md:w-[280px] lg:w-[320px] flex-shrink-0 group perspective-1000 mt-16 md:mt-0">
                    <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] border border-white/10 transition-transform duration-500 hover:scale-[1.02]">
                        <img src={movie.poster_url} alt={movie.title} className="w-full h-auto object-cover" />
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 w-full max-w-4xl flex flex-col justify-center">
                    
                    <div className="flex items-center gap-2 mb-2 text-[10px] md:text-xs font-bold tracking-widest uppercase text-zinc-400">
                        <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md text-white border border-white/5">
                            {movie.media_type === 'movie' ? 'MOVIE' : 'TV SHOW'}
                        </span>
                        {movie.release_date && <><span>•</span><span>{movie.release_date.substring(0, 4)}</span></>}
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white mb-2 leading-tight line-clamp-2">
                        {movie.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-6 text-zinc-300 text-xs md:text-sm mt-1">
                        {movie.vote_average ? (
                            <div className="flex items-center gap-1 bg-blue-500/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg border border-blue-400 shadow-lg shadow-blue-900/40">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-extrabold">{Number(movie.vote_average).toFixed(2)}</span>
                            </div>
                        ) : null}
                        
                        <div className="flex gap-2">
                            {movie.genres && movie.genres.slice(0, 4).map((g, i) => (
                                <span key={i} className="border border-white/10 bg-white/5 rounded-full px-2.5 py-0.5 text-xs font-bold">
                                    {g}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button onClick={handleWatchTrailer} className="h-10 flex items-center gap-1.5 bg-white text-black px-3.5 rounded-xl font-black text-xs md:text-sm hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95">
                            <Play className="w-4 h-4 fill-black" /> Trailer
                        </button>
                        <button onClick={handleAddToList} disabled={Boolean(movieWatchlist[movie.tmdb_id])} className={`h-10 flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white border border-white/10 px-3.5 rounded-xl font-bold text-xs md:text-sm hover:bg-white/20 transition-colors active:scale-95 ${movieWatchlist[movie.tmdb_id] ? 'bg-blue-500/20 text-blue-300 border-blue-400/40 cursor-default' : ''}`}>
                            <Plus className="w-4 h-4" /> {movieWatchlist[movie.tmdb_id] ? 'In Watchlist' : 'Watchlist'}
                        </button>

                        <WatchStatusDropdown
                            currentStatus={movieStatuses[movie.tmdb_id]}
                            onStatusChange={handleMarkWatched}
                            wrapperClass="w-36 shrink-0"
                            className="h-10"
                        />
                        <button 
                            onClick={openRecModal}
                            className="h-10 flex items-center gap-1.5 bg-purple-500/20 text-purple-200 border border-purple-500/30 px-3.5 rounded-xl font-bold text-xs md:text-sm hover:bg-purple-500/30 transition-colors active:scale-95"
                        >
                            <Share2 className="w-4 h-4" /> Recommend
                        </button>
                    </div>

                    <div className="w-full pr-4">
                        <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-light text-justify w-full line-clamp-5 md:line-clamp-6">
                            {movie.overview || "No description available."}
                        </p>
                    </div>

                    <div className="mt-6 flex gap-6 border-t border-white/10 pt-4 text-xs md:text-sm text-zinc-400 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-white" /> <span>{movie.release_date || 'N/A'}</span></div>
                        {movie.runtime && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-white" /> <span>{movie.runtime}m</span></div>}
                        {movie.seasons && <div className="flex items-center gap-2"><Info className="w-4 h-4 text-white" /> <span>{movie.seasons} Seasons</span></div>}
                    </div>
                </div>
            </div>

            {/* RECOMMENDATION MODAL */}
            {isRecModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="font-bold text-white text-base">
                                    Recommend to Friends
                                </h3>
                                <p className="text-xs text-zinc-400 truncate max-w-[280px]">
                                    {movie.title}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsRecModalOpen(false)} 
                                className="text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {loadingFriends ? (
                                <div className="py-12 text-center text-zinc-500 text-sm">Loading friends...</div>
                            ) : friends.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-zinc-300 font-semibold text-sm">No friends added yet</p>
                                    <p className="text-xs text-zinc-500 mt-1">Connect with friends in the Social Hub first.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Selection Controls */}
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

                                    {/* Single friend blocked notice */}
                                    {singleFriendBlockedNotice && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-left animate-in fade-in duration-200">
                                            <p className="text-sm font-bold text-red-400">Recommendation unavailable</p>
                                            <p className="text-xs text-zinc-200 mt-1 font-medium">This friend has already {completedVerb}.</p>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">The recommendation cannot be sent to this friend.</p>
                                        </div>
                                    )}

                                    {/* All friends completed notice */}
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
                                                                This friend has already {completedVerb}.
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
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-98 text-sm"
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

export default MovieDetails;
