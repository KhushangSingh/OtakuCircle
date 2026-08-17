import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Plus, Star, Play, Info, Calendar, Clock, Check, ArrowLeft,
    Share2, X, Send
} from 'lucide-react';

import { useNotification } from '../components/NotificationProvider';

const MovieDetails = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
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
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update", "error");
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
    const openRecModal = async () => {
        setIsRecModalOpen(true);
        setLoadingFriends(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data);
        } catch (error) {
            showNotification("Failed to load friends", "error");
        } finally {
            setLoadingFriends(false);
        }
    };

    const handleSendRecommendation = async () => {
        if (!selectedFriend) return;
        setSending(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/movies/recommend`, {
                friendId: selectedFriend._id,
                tmdbId: movie.tmdb_id,
                title: movie.title,
                poster: movie.poster_url,
                mediaType: movie.media_type,
                message: recMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            showNotification(`Sent to ${selectedFriend.username}!`, "success");
            setIsRecModalOpen(false);
            setRecMessage('');
            setSelectedFriend(null);
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
                className="absolute top-20 left-6 lg:left-12 z-50 p-2 lg:p-3 bg-black/40 hover:bg-black/80 backdrop-blur-md rounded-full border border-white/10 text-white transition-all shadow-xl group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* BACKGROUND POSTER LAYER */}
            <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
                <img 
                    src={movie.backdrop_url || movie.poster_url} 
                    alt="Background" 
                    className="absolute right-0 top-0 w-full md:w-3/4 h-full object-cover opacity-40 blur-md" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
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
                            <div className="flex items-center gap-1 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20 text-yellow-400">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-extrabold">{movie.vote_average.toFixed(1)}</span>
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
                        <button onClick={handleWatchTrailer} className="flex items-center gap-1.5 bg-white text-black px-4 py-2.5 rounded-xl font-black text-xs md:text-sm hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
                            <Play className="w-4 h-4 fill-black" /> Trailer
                        </button>
                        <button onClick={handleAddToList} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-white/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="w-4 h-4" /> Watchlist
                        </button>

                        {/* Recommend Button */}
                        <button 
                            onClick={openRecModal}
                            className="flex items-center gap-1.5 bg-purple-500/20 text-purple-200 border border-purple-500/30 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-purple-500/30 transition-all hover:scale-105 active:scale-95"
                        >
                            <Share2 className="w-4 h-4" /> Recommend
                        </button>

                        <div className="relative inline-block">
                            <select 
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleMarkWatched(e.target.value);
                                        e.target.value = ""; 
                                    }
                                }}
                                className="appearance-none flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:bg-green-500/20 hover:text-green-400 transition-all hover:scale-105 active:scale-95 outline-none cursor-pointer pr-8"
                            >
                                <option value="" disabled selected hidden>Set Status</option>
                                <option value="Watching" className="bg-[#151515] text-white">Watching</option>
                                <option value="Watched" className="bg-[#151515] text-white">Watched</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                <Check className="w-4 h-4" />
                            </div>
                        </div>
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
                    <div className="w-full max-w-md bg-[#151515] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Share2 size={16} className="text-purple-400"/> Recommend Title
                            </h3>
                            <button onClick={() => setIsRecModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="p-4">
                            {loadingFriends ? (
                                <div className="py-10 text-center text-zinc-500">Loading friends...</div>
                            ) : friends.length === 0 ? (
                                <div className="py-10 text-center text-zinc-500">You need to add friends first!</div>
                            ) : !selectedFriend ? (
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Select a Friend</p>
                                    {friends.map(friend => (
                                        <button 
                                            key={friend._id} 
                                            onClick={() => setSelectedFriend(friend)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition text-left border border-transparent hover:border-white/5"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                                                {friend.profilePicture ? 
                                                    <img src={friend.profilePicture} className="w-full h-full object-cover"/> : 
                                                    <div className="w-full h-full flex items-center justify-center text-xs">{friend.username[0]}</div>
                                                }
                                            </div>
                                            <span className="font-medium">{friend.username}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="animate-in slide-in-from-right-10 duration-200">
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl mb-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                                            {selectedFriend.profilePicture ? 
                                                <img src={selectedFriend.profilePicture} className="w-full h-full object-cover"/> : 
                                                <div className="w-full h-full flex items-center justify-center font-bold">{selectedFriend.username[0]}</div>
                                            }
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Recommending to</p>
                                            <p className="font-bold">{selectedFriend.username}</p>
                                        </div>
                                        <button onClick={() => setSelectedFriend(null)} className="ml-auto text-xs text-blue-400 hover:underline">Change</button>
                                    </div>

                                    <textarea
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none h-24 mb-4"
                                        placeholder="Add a message... (optional) [Max 50 chars]"
                                        value={recMessage}
                                        onChange={(e) => setRecMessage(e.target.value)}
                                        maxLength={50}
                                    ></textarea>

                                    <button 
                                        onClick={handleSendRecommendation}
                                        disabled={sending}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sending ? 'Sending...' : <><Send size={16} /> Send Recommendation</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MovieDetails;
