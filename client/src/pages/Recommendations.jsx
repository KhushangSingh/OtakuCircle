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
            className="group relative w-full max-w-[260px] cursor-pointer perspective-1000 mx-auto"
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
                    <div className="absolute top-3 right-3 bg-blue-500/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-400 shadow-lg shadow-blue-900/40 z-10">
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
                        className={`w-[85%] mx-auto flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold backdrop-blur-sm border transition-colors active:scale-95 shadow-lg
                            ${watchlistAdded 
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' 
                                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                            }`}
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span>Watchlist</span>
                    </button>

                    {/* Watched Button */}
                    <div 
                        className={`w-[85%] mx-auto relative rounded-full backdrop-blur-sm border transition-colors shadow-lg
                            ${watchedAdded 
                                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-green-500/20' 
                                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                            }`}
                    >
                        <select 
                            onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.value) {
                                    onAddWatchhistory(anime, e.target.value);
                                    setWatchedAdded(true);
                                    e.target.value = "";
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={watchedAdded}
                            className="appearance-none w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-transparent outline-none cursor-pointer text-center pl-6 pr-4"
                            style={{ textAlignLast: 'center' }}
                        >
                            <option value="" disabled selected hidden>{watchedAdded ? "Added" : "Set Status"}</option>
                            <option value="Watching" className="bg-[#151515] text-white text-left">Watching</option>
                            <option value="Watched" className="bg-[#151515] text-white text-left">Watched</option>
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Check size={16} strokeWidth={3} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-50">
                <h3 className="text-xl font-bold text-gray-100 truncate leading-tight">
                    {anime.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
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
        } catch (error) { 
            showNotification("Failed to add to watched", "error"); 
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
            <div className="w-full px-4 lg:px-8 mb-10 relative z-10">
                <div className="relative p-6 md:p-8 rounded-[32px] overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center">
                    <div className="relative z-20 flex-1 pr-6 max-w-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-zinc-800 to-zinc-400 rounded-lg shadow-lg shadow-zinc-400/20 border border-white/10">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <span className="text-base font-bold tracking-widest text-zinc-300 uppercase">AI Powered</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                            Your Personal <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200">
                                Discovery Feed
                            </span>
                        </h2>
                        <p className="text-zinc-300 text-base md:text-lg font-light leading-relaxed drop-shadow-md">
                            We've analyzed your watch history to find these hidden gems. The more you watch, the smarter we get.
                        </p>
                    </div>
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
                        <img src={heroImage} alt="" className="absolute right-0 top-0 w-[60%] h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent z-10"></div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT GRID --- */}
            <div className="w-full px-4 lg:px-8 relative z-10">
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
                                onAddWatchhistory={handleAddToWatchhistory}
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