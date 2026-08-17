import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Check, ArrowLeft } from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';

// --- SUB-COMPONENT: Anime Card ---
const AnimeCard = ({ anime, onAddWatchlist, onAddWatchhistory, onClick }) => {
    const [watchlistAdded, setWatchlistAdded] = useState(false);
    const [watchedAdded, setWatchedAdded] = useState(false);

    return (
        <div 
            className="group relative w-full cursor-pointer"
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
                    src={anime.poster_url || 'https://via.placeholder.com/200x300?text=No+Image'} 
                    alt={anime.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                {anime.score && (
                    <div className="absolute top-3 right-3 bg-blue-500/50 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-400 shadow-lg shadow-blue-900/40 z-10">
                        ★ {anime.score}
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-2 z-20">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddWatchlist(anime);
                            setWatchlistAdded(true);
                        }}
                        disabled={watchlistAdded}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold backdrop-blur-xl border transition-all active:scale-95 shadow-lg
                            ${watchlistAdded ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span>Watchlist</span>
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddWatchhistory(anime);
                            setWatchedAdded(true);
                        }}
                        disabled={watchedAdded}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold backdrop-blur-xl border transition-all active:scale-95 shadow-lg
                            ${watchedAdded ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-green-500/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    >
                        <Check size={16} strokeWidth={3} />
                        <span>Watched</span>
                    </button>
                </div>
            </div>
            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-50">
                <h3 className="text-xl font-bold text-gray-100 truncate leading-tight">{anime.title}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    <span>{anime.type || 'TV'}</span>
                    {anime.year && <span>• {anime.year}</span>}
                </div>
            </div>
        </div>
    );
};

const sectionMap = {
    trending: { label: 'Trending Now', key: 'trending' },
    latest: { label: 'Just Added', key: 'latest' },
    action: { label: 'Top Action Picks', key: 'action' },
    topRated: { label: 'Top Rated', key: 'topRated' },
    popular: { label: 'Most Popular', key: 'popular' },
    comedy: { label: 'Comedy Picks', key: 'comedy' },
    upcoming: { label: 'Upcoming Hype', key: 'upcoming' },
    fantasy: { label: 'Fantasy Worlds', key: 'fantasy' },
    romance: { label: 'Romance & Drama', key: 'romance' }
};

// --- MAIN PAGE COMPONENT ---
const AnimeSectionMore = () => {
    const { section } = useParams();
    const [animes, setAnimes] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { label, key } = sectionMap[section] || { label: 'Animes', key: section };
    const { showNotification } = useNotification();
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Try fetching directly from home data first
                const res = await axios.get(`${API_URL}/anime/home`);
                let data = res.data[key] || [];
                
                // If specific key data isn't in home response (or insufficient), fetch general list
                if (!data.length) {
                    const [page1, page2] = await Promise.all([
                        axios.get(`${API_URL}/anime?page=1`),
                        axios.get(`${API_URL}/anime?page=2`)
                    ]);
                    const trending = page1.data.animes || [];
                    const latest = page2.data.animes || [];
                    
                    // Filter based on requested section key
                    const all = [...trending, ...latest];
                    // De-duplicate
                    const uniqueAll = Array.from(new Map(all.map(a => [a.mal_id, a])).values());
                    
                    if (key === 'topRated') data = uniqueAll.filter(a => a.score).sort((a, b) => b.score - a.score);
                    else if (key === 'popular') data = uniqueAll.filter(a => a.members).sort((a, b) => b.members - a.members);
                    else if (key === 'comedy') data = uniqueAll.filter(a => a.genres?.includes('Comedy'));
                    else if (key === 'action') data = uniqueAll.filter(a => a.genres?.includes('Action'));
                    else if (key === 'trending') data = trending;
                    else if (key === 'latest') data = latest;
                }
                setAnimes(data);
            } catch (e) {
                console.error(e);
                setAnimes([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [key, API_URL]);

    const handleBack = () => {
        // Return to home and scroll to section
        navigate('/', { state: { scrollToSection: key } });
    };

    const handleAddToWatchlist = async (anime) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/anime/watchlist`, 
                { animeId: anime.mal_id, title: anime.title, poster: anime.poster_url },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("Added to Watchlist", "success");
        } catch (error) {
            showNotification("Failed to add", "error");
        }
    };

    const handleAddToWatchhistory = async (anime) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/anime/watchhistory`, 
                { animeId: anime.mal_id, title: anime.title, poster: anime.poster_url, status: 'Watched' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showNotification("Marked as Watched", "success");
        } catch (error) {
            showNotification("Failed to update", "error");
        }
    };

    const handleCardClick = (mal_id) => { navigate(`/anime/${mal_id}`); };

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
                        {animes.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">No anime found.</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                                {animes.map((anime) => (
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
                    </>
                )}
            </div>
        </div>
    );
};

export default AnimeSectionMore;