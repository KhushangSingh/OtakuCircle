import { useState, useEffect, useCallback } from 'react';
import WatchStatusDropdown from '../components/WatchStatusDropdown';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Sparkles, Plus, Check, Star } from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';

// --- ANIME CARD COMPONENT ---
// Reused design from Home/Recommendations for UI consistency
const AnimeCard = ({ anime, onAddWatchlist, onAddWatchhistory, onClick }) => {
    const [watchlistAdded, setWatchlistAdded] = useState(false);
    const [watchedAdded, setWatchedAdded] = useState(false);

    return (
        <div 
            className="group relative w-full max-w-[200px] cursor-pointer perspective-1000 mx-auto"
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
                    <WatchStatusDropdown 
                        isAdded={watchedAdded}
                        disabled={watchedAdded}
                        onStatusChange={(status) => {
                            onAddWatchhistory(anime, status);
                            setWatchedAdded(true);
                        }}
                        wrapperClass="w-[85%] mx-auto"
                        className="rounded-full"
                    />
                </div>
            </div>

            {/* Metadata */}
            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-50">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-100 truncate leading-tight">
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
const SmartSearch = () => {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    // Environment Variable for API URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Using useCallback to memoize the function and prevent infinite loops in useEffect
    const performSmartSearch = useCallback(async (searchQuery) => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await axios.get(`${API_URL}/search/smart?q=${encodeURIComponent(searchQuery)}`);
            setResults(res.data.data || res.data); 
        } catch (error) {
            console.error("AI Search failed", error);
            showNotification("Search failed. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    }, [API_URL, showNotification]);

    useEffect(() => {
        const urlQuery = searchParams.get('q');
        if (urlQuery) {
            setQuery(urlQuery);
            performSmartSearch(urlQuery);
        }
    }, [searchParams, performSmartSearch]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            navigate(`/smart-search?q=${encodeURIComponent(query)}`);
        }
    };

    const handleCardClick = (id) => navigate(`/anime/${id}`);
    
    const handleAddToWatchlist = async (e, anime) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) { showNotification("Login required", "error"); return; }
        try {
             await axios.post(`${API_URL}/anime/watchlist`, {
                animeId: anime.mal_id, title: anime.title, poster: anime.poster_url
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Added ${anime.title}`, "success");
        } catch(err) { showNotification("Failed to add", "error"); }
    };

    const handleAddToWatchhistory = async (e, anime, statusValue = 'Watched') => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) { showNotification("Login required", "error"); return; }
        try {
             await axios.post(`${API_URL}/anime/watchhistory`, {
                animeId: anime.mal_id, title: anime.title, poster: anime.poster_url, status: statusValue
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Marked ${anime.title} as ${statusValue}`, "success");
        } catch(err) { showNotification("Failed to update", "error"); }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20">
            
            {/* --- HERO SECTION --- */}
            <div className="relative pt-24 pb-12 px-6 overflow-hidden">
                <div className="absolute top-0 left-0 w-full max-w-4xl h-[300px] bg-[#0d0d0d] pointer-events-none" />

                <div className="relative z-10 w-full px-4 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    
                    {/* LEFT COLUMN: Text Content */}
                    <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs font-bold tracking-widest text-zinc-300 uppercase mt-4 mb-6 shadow-sm">
                            <Sparkles size={16} className="text-blue-400" />
                            <span>AI Discovery Engine</span>
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-white mb-6 leading-tight">
                            Search by <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                                Feeling & Context
                            </span>
                        </h1>
                        
                        <p className="text-base md:text-lg lg:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl">
                            Don't recall the name? Just describe the plot, the vibe, or the characters. Our AI understands what you mean.
                        </p>
                    </div>

                    {/* RIGHT COLUMN: Search Bar */}
                    <div className="w-full lg:w-1/2 relative group">
                        <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),inset_0_2px_6px_rgba(0,0,0,0.7)] transition-all group-focus-within:bg-white/10 group-focus-within:border-white/20">
                            <Search className="text-zinc-400 w-5 h-5 mr-4 group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe an anime (e.g., 'Time travel thriller with a microwave')" 
                                className="bg-transparent border-none outline-none text-base lg:text-lg text-white w-full placeholder-zinc-500 font-medium leading-relaxed"
                                autoFocus
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* --- RESULTS SECTION --- */}
            <div className="w-full px-4 lg:px-8 pb-32">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                        <p className="text-zinc-500 font-medium tracking-widest text-xs uppercase animate-pulse">Processing Query...</p>
                    </div>
                ) : (
                    <>
                        {searched && results.length === 0 ? (
                             <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-white/5">
                                    <Search size={28} className="text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No matches found</h3>
                                <p className="text-zinc-500 max-w-md text-sm">
                                    We couldn't find anything matching that description. Try using broader keywords.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4 gap-y-10">
                                {results.map((anime) => (
                                    <AnimeCard 
                                        key={anime.mal_id} 
                                        anime={anime}
                                        onAddWatchlist={handleAddToWatchlist}
                                        onAddWatchhistory={handleAddToWatchhistory}
                                        onClick={() => handleCardClick(anime.mal_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SmartSearch;