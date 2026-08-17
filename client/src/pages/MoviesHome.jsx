import { useEffect, useState, useRef, useCallback } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Plus, Check, ChevronLeft, ChevronRight, Film, Search } from 'lucide-react';
import moviesHeroBg from '../assets/movies-hero-bg-2.png';

// --- COMPONENT: Movie Card ---
const MovieCard = ({ movie, onAddWatchlist, onAddWatchhistory, onClick }) => {
    const [watchlistAdded, setWatchlistAdded] = useState(false);
    const [watchedAdded, setWatchedAdded] = useState(false);

    return (
        <div 
            className="group relative flex-none w-[120px] sm:w-[150px] md:w-[200px] cursor-pointer perspective-1000"
            onClick={onClick}
        >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 transition-all duration-500 ease-out 
                transform-gpu backface-hidden
                group-hover:scale-105 
                group-hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.25)] 
                border border-white/5 group-hover:border-white/20"
                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
                <img 
                    src={movie.poster_url || 'https://via.placeholder.com/200x300?text=No+Image'} 
                    alt={movie.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                
                {movie.score && (
                    <div className="absolute top-3 right-3 bg-blue-500/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-400 shadow-lg shadow-blue-900/40 z-10">
                        ★ {movie.score}
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-2 z-20">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddWatchlist(movie);
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
                            onAddWatchhistory(movie, status);
                            setWatchedAdded(true);
                        }}
                        wrapperClass="w-[85%] mx-auto"
                        className="rounded-full"
                    />
                </div>
            </div>

            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-50">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-100 truncate leading-tight">
                    {movie.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    <span>{movie.type || 'TV'}</span>
                    {movie.year && <span>• {movie.year}</span>}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: Movie Section ---
const MovieSection = ({ title, data, onAddWatchlist, onAddWatchhistory, onCardClick, viewMoreLabel = 'View All', sectionKey, id }) => {
    const scrollRef = useRef(null);
    const navigate = useNavigate();
    
    if (!data || data.length === 0) return null;

    const scroll = (dir) => {
        if (scrollRef.current) {
            const scrollAmount = 600; 
            scrollRef.current.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div id={id} className="mb-16 relative group/section scroll-mt-32">
            <div className="flex items-end justify-between px-4 lg:px-8 mb-6">
                <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">{title}</h2>
                <button 
                    onClick={() => navigate(`/movies/section/${sectionKey}`)} 
                    className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                    {viewMoreLabel} &rarr;
                </button>
            </div>

            <div className="relative">
                <button 
                    onClick={() => scroll(-1)} 
                    className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 -mt-8 z-30 bg-black/50 backdrop-blur-xl border border-white/10 text-white p-3 rounded-full opacity-0 group-hover/section:opacity-100 hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 hidden md:block shadow-2xl"
                >
                    <ChevronLeft size={24} />
                </button>

                <button 
                    onClick={() => scroll(1)} 
                    className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 -mt-8 z-30 bg-black/50 backdrop-blur-xl border border-white/10 text-white p-3 rounded-full opacity-0 group-hover/section:opacity-100 hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 hidden md:block shadow-2xl"
                >
                    <ChevronRight size={24} />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-6 px-4 lg:px-8 overflow-x-auto py-8 scrollbar-hide snap-x"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {data.map((movie, index) => (
                        <MovieCard
                            key={`${movie.tmdb_id}-${index}`}
                            movie={movie}
                            onAddWatchlist={onAddWatchlist}
                            onAddWatchhistory={onAddWatchhistory}
                            onClick={() => onCardClick(movie.tmdb_id, movie.type)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};



// --- COMPONENT: Main Home Page ---
const MoviesHome = () => {
    const [homeData, setHomeData] = useState({ 
        trending: [], popularMovies: [], popularTv: [], topRatedMovies: []
    });
    const [loading, setLoading] = useState(true);
    
    // Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { showNotification } = useNotification();
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const fetchHomeData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/movies/home`);
            setHomeData(res.data);
        } catch (error) {
            console.error("Error fetching home data:", error);
            showNotification("Failed to load movie data", "error");
        } finally {
            setLoading(false);
        }
    }, [API_URL, showNotification]);

    useEffect(() => {
        const loadPageData = async () => {
            const savedScroll = sessionStorage.getItem('otaku_movies_home_scroll');
            await fetchHomeData();
            
            // Scroll logic
            if (location.state?.scrollToSection) {
                setTimeout(() => {
                    const sectionId = `section-${location.state.scrollToSection}`;
                    const element = document.getElementById(sectionId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        window.history.replaceState({}, document.title);
                    }
                }, 100);
            } else if (savedScroll) {
                setTimeout(() => {
                    window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
                }, 100); 
            }
        };
        loadPageData();
    }, [location, fetchHomeData]); // fetchHomeData is now stable due to useCallback

    // Search Logic (Debounced)
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            const query = searchQuery.trim();
            if (query.length > 1) {
                try {
                    const res = await axios.get(`${API_URL}/movies/search?q=${encodeURIComponent(query)}`);
                    setSearchResults(res.data);
                    setIsSearchOpen(true);
                } catch (error) { 
                    setSearchResults([]); 
                }
            } else {
                setSearchResults([]);
                setIsSearchOpen(false);
            }
        }, 300); 
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, API_URL]);

    // Close search dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchResultClick = (id, type) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        navigate(`/movies/${type}/${id}`);
    };

    const handleAddToWatchlist = async (movie) => {
        const token = localStorage.getItem('token');
        if (!token) { showNotification("Please login first!", "error"); return; }
        try {
            await axios.post(`${API_URL}/movie/watchlist`, {
                movieId: movie.tmdb_id, title: movie.title, poster: movie.poster_url
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Added ${movie.title} to your watchlist!`, "success");
        } catch (error) { 
            showNotification(error.response?.data?.message || "Error", "error"); 
        }
    };

    const handleAddToWatchhistory = async (movie, statusValue = 'Watched') => {
        const token = localStorage.getItem('token');
        if (!token) { showNotification("Please login first!", "error"); return; }
        try {
            await axios.post(`${API_URL}/movies/watchhistory`, {
                movieId: movie.tmdb_id, title: movie.title, poster: movie.poster_url, status: statusValue
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Added ${movie.title} to history!`, "success");
        } catch (error) { 
            showNotification(error.response?.data?.message || "Error", "error"); 
        }
    };

    const handleCardClick = (tmdb_id, type) => {
        sessionStorage.setItem('otaku_movies_home_scroll', window.scrollY.toString());
        navigate(`/movies/${type}/${tmdb_id}`);
    };

    const handleScrollToTrending = () => {
        const element = document.getElementById('section-trending');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <p className="text-zinc-500 text-sm font-medium tracking-wide">Loading the Cinematic world...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20 pb-20 pt-28">
            
            {/* --- HERO HEADER --- */}
            <div className="w-full px-4 lg:px-8 mb-12 relative z-50 mt-2">
                <div className="relative p-6 md:p-8 rounded-[32px] border border-white/10 bg-black shadow-2xl flex flex-col md:flex-row items-center gap-6">
                    
                    <div className="relative z-20 flex-1 max-w-2xl w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-1.5 bg-gradient-to-br from-red-900 to-red-500 rounded-lg shadow-lg shadow-red-500/20 border border-red-500/30">
                                <Film size={16} className="text-white" />
                            </div>
                            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Premium Entertainment</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                            Cinematic <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-500">
                                Universe
                            </span>
                        </h2>
                        <p className="text-zinc-400 text-base md:text-lg font-light leading-relaxed">
                            Discover blockbuster hits, trending television series, and critically acclaimed masterpieces.
                        </p>
                    </div>

                    {/* --- Search Bar --- */}
                    <div className="relative md:absolute md:top-6 md:right-6 lg:top-8 lg:right-8 z-30 w-full md:w-72 lg:w-96 mt-6 md:mt-0" ref={searchRef}>
                        <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-3 transition-all duration-300 focus-within:bg-black/60 focus-within:border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                            <Search className="text-zinc-500 w-5 h-5 mr-3 transition-colors" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search movies & shows..." 
                                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-zinc-500"
                            />
                        </div>
                        {isSearchOpen && (
                            <div className="absolute top-full mt-3 w-full bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 text-gray-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5">
                                <style>{`
                                    .search-results-scrollbar::-webkit-scrollbar { width: 4px; }
                                    .search-results-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                    .search-results-scrollbar::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 4px; }
                                `}</style>
                                <div className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-widest bg-white/5 border-b border-white/5 backdrop-blur-md">
                                    Top Matches
                                </div>
                                <div 
                                    className="search-results-scrollbar overflow-y-auto"
                                    style={{
                                        maxHeight: '260px', /* Approx 3-4 items (item is ~72px high) */
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#3f3f46 transparent'
                                    }}
                                >
                                    {searchResults.length > 0 ? searchResults.map(item => (
                                        <div key={item.tmdb_id} onClick={() => handleSearchResultClick(item.tmdb_id, item.type)} className="flex items-center gap-4 p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-none transition-colors group/item">
                                            <img src={item.poster_url || 'https://via.placeholder.com/40x60?text=NA'} alt={item.title} className="w-10 h-14 object-cover rounded shadow-md bg-zinc-800 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-white truncate group-hover/item:text-blue-400 transition-colors">{item.title}</p>
                                                <p className="text-[10px] text-zinc-400 mt-0.5 uppercase">{item.type} • {item.year || 'N/A'}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-4 text-center text-xs text-zinc-500">No matches found.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px] z-0">
                        <img src={moviesHeroBg} alt="" className="absolute right-0 top-0 w-[60%] h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent z-10"></div>
                    </div>
                </div>
            </div>

            <div className="space-y-8 pb-20 relative z-20 bg-[#0d0d0d]">
                <MovieSection 
                    id="section-trending" 
                    title="Trending This Week" 
                    data={homeData.trending} 
                    onAddWatchlist={handleAddToWatchlist}
                    onAddWatchhistory={handleAddToWatchhistory}
                    onCardClick={handleCardClick}
                    sectionKey="trending"
                />
                <MovieSection id="section-popular-movies" title="Popular Movies" data={homeData.popularMovies} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="popularMovies" />
                <MovieSection id="section-popular-tv" title="Popular TV Shows" data={homeData.popularTv} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="popularTv" />
                <MovieSection id="section-top-rated" title="Top Rated Masterpieces" data={homeData.topRatedMovies} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="topRatedMovies" />
            </div>
        </div>
    );
};

export default MoviesHome;
