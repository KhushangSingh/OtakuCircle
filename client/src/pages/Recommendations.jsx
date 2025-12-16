import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Tv, Star, Check } from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';
import heroImage from '../assets/spotlight-hero-bg.jpg';

// --- ANIME CARD COMPONENT ---
// Matches Home Page Dimensions & Design exactly
const AnimeCard = ({ anime, onAddWatchlist, onAddWatchhistory, onClick }) => {
    const [watchlistAdded, setWatchlistAdded] = useState(false);
    const [watchedAdded, setWatchedAdded] = useState(false);

    return (
        <div 
            className="group relative w-full max-w-[220px] cursor-pointer perspective-1000 mx-auto"
            onClick={onClick}
        >
            {/* Poster Container */}
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 transition-all duration-500 ease-out 
                transform-gpu backface-hidden
                group-hover:scale-105 
                group-hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.25)] 
                border border-white/5 group-hover:border-white/20"
                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
                <img 
                    src={anime.poster_url || 'https://via.placeholder.com/200x300?text=No+Image'} 
                    alt={anime.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Score Badge */}
                {anime.score && (
                    <div className="absolute top-3 right-3 bg-blue-500/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-400 shadow-lg shadow-blue-900/40 z-10">
                        ★ {anime.score}
                    </div>
                )}

                {/* HOVER ACTIONS OVERLAY */}
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-2 z-20">
                    
                    {/* Watchlist Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddWatchlist(e, anime);
                            setWatchlistAdded(true);
                        }}
                        disabled={watchlistAdded}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold backdrop-blur-xl border transition-all active:scale-95 shadow-lg
                            ${watchlistAdded 
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' 
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                    >
                        <Plus size={14} strokeWidth={3} />
                        <span>Watchlist</span>
                    </button>

                    {/* Watched Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddWatchhistory(e, anime);
                            setWatchedAdded(true);
                        }}
                        disabled={watchedAdded}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold backdrop-blur-xl border transition-all active:scale-95 shadow-lg
                            ${watchedAdded 
                                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-green-500/20' 
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                    >
                        <Check size={14} strokeWidth={3} />
                        <span>Watched</span>
                    </button>
                </div>
            </div>

            {/* Metadata */}
            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-50">
                <h3 className="text-sm font-bold text-gray-100 truncate leading-tight">
                    {anime.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    <span>{anime.type || 'TV'}</span>
                    {anime.year && <span>• {anime.year}</span>}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const Recommendations = () => {
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    // Use Environment Variable for API URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchRecs = async () => {
            const token = localStorage.getItem('token');
            
            // Handle case where user is not logged in
            if (!token) {
                setLoading(false);
                return; 
            }

            try {
                const res = await axios.get(`${API_URL}/recommendations`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Standardize response data structure
                if (res.data.data) {
                    setRecs(res.data.data);
                } else {
                    setRecs(res.data);
                }
            } catch (error) {
                console.error("Error fetching recommendations:", error);
                // Optional: showNotification("Could not load recommendations", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchRecs();
    }, [API_URL]);

    const handleCardClick = (id) => {
        navigate(`/anime/${id}`);
    };

    const handleAddToWatchlist = async (e, anime) => {
        e.stopPropagation();
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
        } catch(err) {
            showNotification("Failed to add to watchlist", "error");
        }
    };

    const handleAddToWatchHistory = async (e, anime) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification("Please login first", "error");
            return;
        }

        try {
            await axios.post(`${API_URL}/anime/watchhistory`, {
                animeId: anime.mal_id, 
                title: anime.title, 
                poster: anime.poster_url, 
                status: 'Watched'
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            showNotification(`Marked ${anime.title} as Watched`, "success");
        } catch(err) {
            showNotification("Failed to update history", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-medium tracking-widest text-xs uppercase">Curating For You</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-20 pt-28 relative overflow-hidden">
            
            {/* --- HERO HEADER --- */}
            <div className="container mx-auto px-6 mb-12 relative z-10">
                <div className="relative p-8 rounded-3xl overflow-hidden border border-white/10 bg-[#0d0d0d]/40 backdrop-blur-2xl shadow-2xl flex items-center">
                    <div className="relative z-20 flex-1 pr-8 max-w-lg">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-zinc-800 to-zinc-400 rounded-lg shadow-lg shadow-zinc-400/20 border border-white/10">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <span className="text-sm font-bold tracking-widest text-zinc-300 uppercase">AI Powered</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                            Your Personal <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200">
                                Discovery Feed
                            </span>
                        </h2>
                        <p className="text-zinc-300 text-lg font-light leading-relaxed drop-shadow-md">
                            We've analyzed your watch history to find these hidden gems. The more you watch, the smarter we get.
                        </p>
                    </div>
                    <div className="absolute top-0 right-0 w-[85%] h-full pointer-events-none overflow-hidden rounded-r-3xl">
                        <img src={heroImage} alt="" className="w-full h-full object-cover opacity-80 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent z-10"></div>
                        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-purple-900/20 to-blue-900/20 blur-[100px] opacity-50 z-20 mix-blend-screen"></div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT GRID --- */}
            <div className="container mx-auto px-6 relative z-10">
                {recs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center mx-auto max-w-2xl backdrop-blur-sm">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
                            <Tv size={40} className="text-zinc-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">Your queue is empty</h3>
                        <p className="text-zinc-500 max-w-md mb-8 leading-relaxed">
                            Start watching and rating anime to help our AI algorithm understand your unique taste!
                        </p>
                        <button 
                            onClick={() => navigate('/')} 
                            className="px-10 py-4 bg-white text-black font-bold rounded-full hover:bg-zinc-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            Explore Trending Anime
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {recs.map((anime) => (
                            <AnimeCard 
                                key={anime._id || anime.mal_id} 
                                anime={anime} 
                                onAddWatchlist={handleAddToWatchlist}
                                onAddWatchhistory={handleAddToWatchHistory}
                                onClick={() => handleCardClick(anime.mal_id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Recommendations;