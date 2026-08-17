import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Tv, User, Check, PlayCircle, Clock, Zap } from 'lucide-react';

// --- Reusable Anime Card Component (Unchanged) ---
const AnimeCard = ({ anime }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Watching':
                return {
                    bg: 'bg-green-500/20 border-green-500/30 text-green-400',
                    icon: <PlayCircle size={12} className="text-green-400 fill-current opacity-50" />
                };
            case 'Watched':
            case 'Completed':
                return {
                    bg: 'bg-red-500/20 border-red-500/30 text-red-400',
                    icon: <Check size={12} className="text-red-400" />
                };
            default:
                return {
                    bg: 'bg-zinc-500/20 border-zinc-500/30 text-zinc-400',
                    icon: <Clock size={12} className="text-zinc-400" />
                };
        }
    };

    const statusStyle = getStatusStyle(anime.status);

    return (
        <div className="group relative cursor-pointer flex-none">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 transition-all duration-500 ease-out 
                transform-gpu backface-hidden
                group-hover:scale-105 
                group-hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.25)] 
                border border-white/5 group-hover:border-white/20"
                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
                {anime.poster ? (
                    <img 
                        src={anime.poster} 
                        alt={anime.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                        <Tv size={32} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                
                {anime.score > 0 && (
                    <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-400 shadow-lg shadow-blue-900/40 z-10">
                        ★ {anime.score}
                    </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                    <div className={`flex items-center gap-2 text-xs font-bold backdrop-blur-md border px-3 py-2 rounded-lg ${statusStyle.bg}`}>
                        {statusStyle.icon}
                        <span>{anime.status || 'Watched'}</span>
                    </div>
                </div>
            </div>
            <div className="mt-4 px-1 space-y-1 transition-opacity duration-300 group-hover:opacity-80">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-100 truncate leading-tight">
                    {anime.title}
                </h3>
            </div>
        </div>
    );
};

const FriendWatchedList = () => {
    const { username } = useParams();
    const [watched, setWatched] = useState([]);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchWatched = async () => {
            try {
                const res = await axios.get(`${API_URL}/users/${username}`);
                setUserData(res.data);
                setWatched(res.data.watchhistory ? [...res.data.watchhistory].reverse() : []);
            } catch (err) {
                console.error("Error fetching watched list", err);
                setWatched([]);
            } finally {
                setLoading(false);
            }
        };
        fetchWatched();
    }, [username, API_URL]);

    // LOGIC: Count only "Watched" or "Completed" status
    const completedCount = watched.filter(item => 
        item.status === 'Watched' || item.status === 'Completed'
    ).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-white">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-medium tracking-widest text-xs uppercase">Loading History...</p>
            </div>
        );
    }

    return (
        // Added pt-32 to fix navbar overlap
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans pb-20 pt-32">
            
            <div className="w-full px-4 lg:px-8">
                
                {/* --- TOP NAVIGATION BAR --- */}
                <div className="flex justify-between items-center mb-12">
                    {/* Left: Smaller Profile Text */}
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white/90 select-none">
                        Profile
                    </h2>

                    {/* Right: Back Button */}
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all hover:scale-105 active:scale-95 group"
                    >
                        <span className="font-bold text-sm tracking-wide text-zinc-300 group-hover:text-white">Back</span>
                        <ChevronRight size={16} className="text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* --- PROFILE IDENTITY SECTION --- */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12">
                    
                    {/* AVATAR: Smaller Size */}
                    <div className="relative shrink-0 group">
                        <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        {userData?.profilePicture ? (
                            <img 
                                src={userData.profilePicture} 
                                alt={username} 
                                className="relative w-28 h-28 md:w-36 md:h-36 rounded-[2rem] object-cover shadow-2xl z-10" 
                            />
                        ) : (
                            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center text-zinc-400 shadow-2xl z-10">
                                <User size={48} />
                            </div>
                        )}
                    </div>

                    {/* USER INFO */}
                    <div className="flex-1 text-center md:text-left pb-1">
                        {/* Name: Smaller Font */}
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4 leading-none">
                            {username}
                        </h1>
                        
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            
                            {/* NEON FROZEN LEVEL BUTTON */}
                            <span className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_-3px_rgba(59,130,246,0.5)] transition-shadow cursor-default">
                                <Zap size={16} fill="currentColor" />
                                Level {Math.floor(Math.sqrt(watched.length)) + 1}
                            </span>

                            {/* WATCHED COUNT */}
                            <p className="text-zinc-400 text-sm md:text-base font-medium">
                                <span className="text-white font-bold">{completedCount}</span> Animes Completed
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- THICKER SEPARATOR LINE --- */}
                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-white/15 to-transparent mb-12 rounded-full"></div>

                {/* --- CONTENT GRID --- */}
                {watched.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                            <Tv size={28} className="text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-bold mb-1 text-white">No history found</h3>
                        <p className="text-zinc-500 text-sm">
                            {username} hasn't started their journey yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 animate-fade-in-up">
                        {watched.map((item, idx) => (
                            <AnimeCard key={idx} anime={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendWatchedList;