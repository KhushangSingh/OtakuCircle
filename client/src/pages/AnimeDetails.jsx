import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Plus, Star, Play, Info, Calendar, Clock, Check, 
    ArrowLeft, Share2, X, Send 
} from 'lucide-react';

import { useNotification } from '../components/NotificationProvider';

const AnimeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [anime, setAnime] = useState(null);

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
                const res = await axios.get(`${API_URL}/anime/${id}`);
                setAnime(res.data);
            } catch (error) {
                console.error("Failed to load anime details");
            }
        };
        fetchDetails();
    }, [id, API_URL]);

    // --- HANDLERS ---
    const handleAddToList = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/anime/watchlist`, 
                { 
                    animeId: anime.mal_id, 
                    title: anime.title, 
                    poster: anime.poster_url 
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("Added to Watchlist", "success");
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add", "error");
        }
    };

    const handleMarkWatched = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/anime/watchhistory`, 
                { 
                    animeId: anime.mal_id, 
                    title: anime.title, 
                    poster: anime.poster_url,
                    status: 'Watched'
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("Marked as Watched", "success");
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update", "error");
        }
    };

    const handleWatchTrailer = () => {
        const trailerLink = anime.trailer_url || anime.trailer?.url;
        if (trailerLink) {
            window.open(trailerLink, '_blank', 'noopener,noreferrer');
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
            await axios.post(`${API_URL}/social/recommend`, {
                friendId: selectedFriend._id,
                animeId: anime.mal_id,
                animeTitle: anime.title,
                animePoster: anime.poster_url,
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

    if (!anime) return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-zinc-400 font-medium text-sm">Loading...</span>
            </div>
        </div>
    );

    return (
        <div className="relative h-screen w-full bg-[#0d0d0d] text-white overflow-hidden font-sans flex items-center pt-20">
            
            {/* BACK BUTTON */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-24 left-6 z-40 flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
                title="Go Back"
            >
                <ArrowLeft size={20} />
            </button>

            {/* IMMERSIVE BACKGROUND */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={anime.poster_url} 
                    alt="Background" 
                    className="w-full h-full object-cover opacity-10 blur-xl scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-[#0d0d0d]/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-[#0d0d0d]/70 to-transparent" />
            </div>

            {/* MAIN CONTENT */}
            <div className="relative z-10 container mx-auto px-6 lg:px-12 flex flex-col md:flex-row gap-10 lg:gap-16 items-center justify-center h-full">
                
                {/* Poster */}
                <div className="hidden md:block w-[300px] md:w-[350px] lg:w-[400px] flex-shrink-0 group perspective-1000">
                    <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10 transition-transform duration-500 hover:scale-[1.02]">
                        <img src={anime.poster_url} alt={anime.title} className="w-full h-auto object-cover" />
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 w-full max-w-4xl flex flex-col justify-center">
                    
                    <div className="flex items-center gap-3 mb-2 text-[10px] md:text-xs font-bold tracking-widest uppercase text-zinc-400">
                        <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white border border-white/5">
                            {anime.type || 'TV'}
                        </span>
                        {anime.status && <><span>•</span><span>{anime.status}</span></>}
                        {anime.episodes && <><span>•</span><span>{anime.episodes} Ep</span></>}
                        {anime.year && <><span>•</span><span>{anime.year}</span></>}
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-1 leading-tight line-clamp-2">
                        {anime.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-6 text-zinc-300 text-xs md:text-sm mt-2">
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="font-bold">{anime.score}</span>
                        </div>
                        <div className="flex gap-2">
                            {anime.genres && anime.genres.slice(0, 4).map((g, i) => (
                                <span key={i} className="border border-white/10 bg-white/5 rounded-full px-2.5 py-0.5 text-xs">
                                    {typeof g === 'string' ? g : g.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button onClick={handleWatchTrailer} className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-zinc-200 transition-all shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-black" /> Trailer
                        </button>
                        <button onClick={handleAddToList} className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/10 px-5 py-2 rounded-lg font-semibold text-xs md:text-sm hover:bg-white/20 transition-all">
                            <Plus className="w-3.5 h-3.5" /> Watchlist
                        </button>
                        
                        {/* Recommend Button */}
                        <button 
                            onClick={openRecModal}
                            className="flex items-center gap-2 bg-purple-500/20 text-purple-200 border border-purple-500/30 px-5 py-2 rounded-lg font-semibold text-xs md:text-sm hover:bg-purple-500/30 transition-all"
                        >
                            <Share2 className="w-3.5 h-3.5" /> Recommend
                        </button>

                        <button onClick={handleMarkWatched} className="flex items-center justify-center bg-white/10 backdrop-blur-md text-white border border-white/10 w-10 h-9 rounded-lg hover:bg-green-500/20 hover:text-green-400 transition-all">
                            <Check className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-full pr-4">
                        <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-light text-justify w-full line-clamp-[10]">
                            {anime.synopsis}
                        </p>
                    </div>

                    <div className="mt-6 flex gap-6 border-t border-white/5 pt-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> <span>{anime.year || 'N/A'}</span></div>
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> <span>{anime.duration || '24m'}</span></div>
                    </div>
                </div>
            </div>

            {/* RECOMMENDATION MODAL */}
            {isRecModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#151515] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Share2 size={16} className="text-purple-400"/> Recommend Anime
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
                                        placeholder="Add a message... (optional)"
                                        value={recMessage}
                                        onChange={(e) => setRecMessage(e.target.value)}
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

export default AnimeDetails;