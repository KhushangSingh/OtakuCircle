import { useEffect, useState, useRef, useCallback } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import heroImage from '../assets/spotlight-hero-bg.jpg';

// --- COMPONENT: Anime Card ---
const AnimeCard = ({ anime, onAddWatchlist, onAddWatchhistory, onClick }) => {
    const [watchlistAdded, setWatchlistAdded] = useState(false);
    const [watchedAdded, setWatchedAdded] = useState(false);

    return (
        <div 
            className="group relative flex-none w-[200px] md:w-[260px] cursor-pointer perspective-1000"
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
                        className={`w-[85%] mx-auto flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold backdrop-blur-sm border transition-colors active:scale-95 shadow-lg
                            ${watchlistAdded 
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20' 
                                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                            }`}
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span>Watchlist</span>
                    </button>

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

// --- COMPONENT: Anime Section ---
const AnimeSection = ({ title, data, onAddWatchlist, onAddWatchhistory, onCardClick, viewMoreLabel = 'View All', sectionKey, id }) => {
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
            <div className="flex items-end justify-between px-4 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h2>
                <button 
                    onClick={() => navigate(`/section/${sectionKey}`)} 
                    className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                    {viewMoreLabel} &rarr;
                </button>
            </div>

            <div className="relative">
                <button 
                    onClick={() => scroll(-1)} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 -mt-8 z-30 bg-black/50 backdrop-blur-xl border border-white/10 text-white p-3 rounded-full opacity-0 group-hover/section:opacity-100 hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 hidden md:block shadow-2xl"
                >
                    <ChevronLeft size={24} />
                </button>

                <button 
                    onClick={() => scroll(1)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 -mt-8 z-30 bg-black/50 backdrop-blur-xl border border-white/10 text-white p-3 rounded-full opacity-0 group-hover/section:opacity-100 hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 hidden md:block shadow-2xl"
                >
                    <ChevronRight size={24} />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-6 px-4 overflow-x-auto py-8 scrollbar-hide snap-x"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {data.map((anime, index) => (
                        <AnimeCard
                            key={`${anime.mal_id}-${index}`}
                            anime={anime}
                            onAddWatchlist={onAddWatchlist}
                            onAddWatchhistory={onAddWatchhistory}
                            onClick={() => onCardClick(anime.mal_id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: Spotlight Hero ---
const SpotlightHero = ({ backgroundImage, onExplore }) => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const maxScroll = 500; 
    const progress = Math.min(scrollY / maxScroll, 1);
    const scale = 1 - (progress * 0.2); 
    const opacity = 1 - progress; 
    const yOffset = scrollY * 0.5; 

    return (
        <div 
            className="relative w-full h-screen flex items-center justify-center overflow-hidden mb-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }} 
        >
            <div className="absolute inset-0 bg-black/60 z-0" />
            <div className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent via-[#0d0d0d]/30 to-[#0d0d0d] z-10" />

            <div 
                className="relative z-20 text-center px-4 max-w-6xl mx-auto"
                style={{
                    transform: `translateY(${yOffset}px) scale(${scale})`,
                    opacity: opacity,
                    willChange: 'transform, opacity',
                    pointerEvents: opacity <= 0 ? 'none' : 'auto' 
                }}
            >
                <h1 
                    className="text-7xl md:text-[9rem] font-extrabold tracking-tighter leading-none text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] select-none py-4 px-4 pb-2"
                    style={{
                        background: 'linear-gradient(to bottom, #ffffff, #a1a1aa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))'
                    }}
                >
                    OtakuCircle
                </h1>
                
                <p className="mt-4 text-lg md:text-2xl text-zinc-300 font-medium max-w-2xl mx-auto tracking-wide drop-shadow-md">
                    Track your journey. Discover new worlds. Connect with friends.
                </p>
                
                <div className="mt-10 flex justify-center gap-4">
                    <button 
                        onClick={onExplore}
                        className="px-10 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                        Start Exploring
                    </button>
                </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none z-20" />
        </div>
    );
};

// --- COMPONENT: Main Home Page ---
const Home = () => {
    const [homeData, setHomeData] = useState({ 
        trending: [], topRated: [], popular: [], upcoming: [], latest: [],
        action: [], fantasy: [], romance: []
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { showNotification } = useNotification();
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const fetchHomeData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/anime/home`);
            setHomeData(res.data);
        } catch (error) {
            console.error("Error fetching home data:", error);
            showNotification("Failed to load anime data", "error");
        } finally {
            setLoading(false);
        }
    }, [API_URL, showNotification]);

    useEffect(() => {
        const loadPageData = async () => {
            const savedScroll = sessionStorage.getItem('otaku_home_scroll');
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

    const handleAddToWatchlist = async (anime) => {
        const token = localStorage.getItem('token');
        if (!token) { showNotification("Please login first!", "error"); return; }
        try {
            await axios.post(`${API_URL}/anime/watchlist`, {
                animeId: anime.mal_id, title: anime.title, poster: anime.poster_url
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Added ${anime.title} to your watchlist!`, "success");
        } catch (error) { 
            showNotification(error.response?.data?.message || "Error", "error"); 
        }
    };

    const handleAddToWatchhistory = async (anime, statusValue = 'Watched') => {
        const token = localStorage.getItem('token');
        if (!token) { showNotification("Please login first!", "error"); return; }
        try {
            await axios.post(`${API_URL}/anime/watchhistory`, {
                animeId: anime.mal_id, title: anime.title, poster: anime.poster_url, status: statusValue
            }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification(`Added ${anime.title} to history!`, "success");
        } catch (error) { 
            showNotification(error.response?.data?.message || "Error", "error"); 
        }
    };

    const handleCardClick = (mal_id) => {
        sessionStorage.setItem('otaku_home_scroll', window.scrollY.toString());
        navigate(`/anime/${mal_id}`);
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
                    <p className="text-zinc-500 text-sm font-medium tracking-wide">Loading the ANIME world...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20">
            <SpotlightHero backgroundImage={heroImage} onExplore={handleScrollToTrending} />

            <div className="space-y-8 pb-20 relative z-20 bg-[#0d0d0d]">
                <AnimeSection 
                    id="section-trending" 
                    title="Trending Now" 
                    data={homeData.trending} 
                    onAddWatchlist={handleAddToWatchlist}
                    onAddWatchhistory={handleAddToWatchhistory}
                    onCardClick={handleCardClick}
                    sectionKey="trending"
                />
                <AnimeSection id="section-latest" title="Latest Season" data={homeData.latest} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="latest" />
                <AnimeSection id="section-topRated" title="Top Rated Masterpieces" data={homeData.topRated} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="topRated" />
                <AnimeSection id="section-popular" title="All-Time Popular" data={homeData.popular} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="popular" />
                <AnimeSection id="section-upcoming" title="Upcoming Hype" data={homeData.upcoming} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="upcoming" />
                <AnimeSection id="section-action" title="Action & Adventure" data={homeData.action} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="action" />
                <AnimeSection id="section-fantasy" title="Fantasy Worlds" data={homeData.fantasy} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="fantasy" />
                <AnimeSection id="section-romance" title="Romance & Drama" data={homeData.romance} onAddWatchlist={handleAddToWatchlist} onAddWatchhistory={handleAddToWatchhistory} onCardClick={handleCardClick} sectionKey="romance" />
            </div>
        </div>
    );
};

export default Home;
