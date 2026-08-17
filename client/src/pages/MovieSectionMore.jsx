import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Check, ArrowLeft } from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';

// --- SUB-COMPONENT: Movie Card ---
const MovieCard = ({ movie, onAddWatchlist, onAddWatchhistory, onClick }) => {
    const [watchlistAdded, setWatchlistAdded] = useState(false);
    const [watchedAdded, setWatchedAdded] = useState(false);

    return (
        <div 
            className="group relative w-full cursor-pointer perspective-1000"
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
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold backdrop-blur-xl border transition-all active:scale-95 shadow-lg
                            ${watchlistAdded ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
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
                <h3 className="text-xl font-bold text-gray-100 truncate leading-tight">
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

const sectionMap = {
    trending: { label: 'Trending This Week', key: 'trending' },
    popularMovies: { label: 'Popular Movies', key: 'popularMovies' },
    popularTv: { label: 'Popular TV Shows', key: 'popularTv' },
    topRatedMovies: { label: 'Top Rated Masterpieces', key: 'topRatedMovies' }
};

// --- MAIN PAGE COMPONENT ---
const MovieSectionMore = () => {
    const { section } = useParams();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { label, key } = sectionMap[section] || { label: 'Movies & Shows', key: section };
    const { showNotification } = useNotification();
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch directly from movies home endpoint to get the list
                const res = await axios.get(`${API_URL}/movies/home`);
                let data = res.data[key] || [];
                setMovies(data);
            } catch (e) {
                console.error(e);
                setMovies([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [key, API_URL]);

    const handleBack = () => {
        // Return to movies home and scroll to section
        navigate('/movies', { state: { scrollToSection: key } });
    };

    const handleAddToWatchlist = async (movie) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification("Please login first!", "error");
                return;
            }
            await axios.post(`${API_URL}/movies/watchlist`, 
                { tmdbId: movie.tmdb_id, title: movie.title, poster: movie.poster_url, mediaType: movie.type },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification(`Added ${movie.title} to Watchlist`, "success");
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add", "error");
        }
    };

    const handleAddToWatchhistory = async (movie, statusValue = 'Watched') => {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification("Please login first!", "error");
            return;
        }
        try {
            await axios.post(`${API_URL}/movies/watchhistory`, 
                { tmdbId: movie.tmdb_id, title: movie.title, poster: movie.poster_url, mediaType: movie.type, status: statusValue },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification(`Marked ${movie.title} as ${statusValue}`, "success");
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to add", "error");
        }
    };

    const handleCardClick = (tmdb_id, type) => { navigate(`/movies/${type}/${tmdb_id}`); };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20 pt-24">
            <div className="sticky top-20 z-30 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center gap-4">
                <button 
                    onClick={handleBack}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-2xl font-bold tracking-wide">{label}</h1>
            </div>

            <div className="w-full px-4 lg:px-8 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <p className="text-zinc-500 text-sm font-medium tracking-wide">LOADING CONTENT</p>
                    </div>
                ) : (
                    <>
                        {movies.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">No movies found.</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                                {movies.map((movie) => (
                                    <MovieCard
                                        key={movie.tmdb_id}
                                        movie={movie}
                                        onAddWatchlist={handleAddToWatchlist}
                                        onAddWatchhistory={handleAddToWatchhistory}
                                        onClick={() => handleCardClick(movie.tmdb_id, movie.type)}
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

export default MovieSectionMore;
