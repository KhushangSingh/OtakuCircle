import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Check, Plus, MoreVertical, Archive, EyeOff, Trash2, RefreshCw } from './icons';

const AvatarItem = ({ user, size = 'sm', className = '' }) => {
    if (user?.profilePicture) {
        return (
            <img 
                src={user.profilePicture} 
                alt={user.username || 'Friend'} 
                title={user.username || 'Friend'}
                className={`rounded-full object-cover bg-zinc-800 border-2 border-[#121212] ${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} ${className}`} 
            />
        );
    }
    return (
        <div 
            title={user?.username || 'Friend'}
            className={`rounded-full bg-gradient-to-t from-zinc-800 to-zinc-700 flex items-center justify-center text-white font-bold border-2 border-[#121212] ${size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} ${className}`}
        >
            {user?.username?.charAt(0).toUpperCase() || 'F'}
        </div>
    );
};

export default function GroupedRecommendationCard({
    group,
    onOpenDetails,
    onPlanToWatch,
    onMarkWatched,
    onUpdateTitleStatus,
    onRemoveTitle,
    trackingStatus, // 'Plan to watch', 'Watching', 'Watched', or null
    inWatchlist
}) {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const anime = group.anime || {};
    const movie = group.movie;
    const title = anime.title || movie?.title || 'Unknown Title';
    const poster = anime.poster_url || movie?.poster;
    const genres = (anime.genres && anime.genres.length > 0) 
        ? anime.genres.slice(0, 3).join(' · ') 
        : (movie?.mediaType ? movie.mediaType.toUpperCase() : (anime.type || 'Anime'));

    const distinctCount = group.distinctCount || 1;
    const distinctFriends = group.distinctFriends || [];
    const isNotInterested = group.groupStatus === 'not_interested';
    const isArchived = group.groupStatus === 'archived';

    // Status label
    const displayStatus = trackingStatus || (inWatchlist ? 'Plan to watch' : 'Not started');
    const isStatusWatched = trackingStatus === 'Watched' || trackingStatus === 'Completed';
    const isStatusPlanToWatch = inWatchlist || trackingStatus === 'Plan to watch';

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const handleCardClick = () => {
        onOpenDetails(group);
    };

    const handlePosterClick = (e) => {
        e.stopPropagation();
        if (anime.mal_id) {
            const params = new URLSearchParams();
            if (anime.mediaType) params.set('mediaType', anime.mediaType);
            if (anime.title) params.set('title', anime.title);
            const query = params.toString();
            navigate(`/anime/${anime.mal_id}${query ? `?${query}` : ''}`, {
                state: { mediaType: anime.mediaType, title: anime.title }
            });
        } else if (movie?.tmdbId) {
            navigate(`/movie/${movie.tmdbId}`);
        } else {
            onOpenDetails(group);
        }
    };

    return (
        <div 
            onClick={handleCardClick}
            className={`group relative rounded-2xl md:rounded-3xl p-4 sm:p-5 transition-all duration-300 border cursor-pointer select-none
                ${isNotInterested 
                    ? 'bg-[#101010]/80 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20' 
                    : isArchived
                    ? 'bg-[#121212]/90 border-white/10 hover:border-white/20'
                    : 'bg-[#121212]/95 hover:bg-[#161616] border-white/10 hover:border-white/25 shadow-xl hover:shadow-2xl'
                }`}
        >
            {/* Top Content Row */}
            <div className="flex gap-4 sm:gap-5 items-start">
                
                {/* Poster Thumbnail */}
                <div 
                    onClick={handlePosterClick}
                    className="relative w-20 sm:w-24 md:w-28 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-lg border border-white/10 bg-zinc-900 group/poster"
                    title={`View ${title} details`}
                >
                    {poster ? (
                        <img 
                            src={poster} 
                            alt={title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/poster:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                            <Film size={24} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Right Info Section */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                        {/* Title & Quick Actions */}
                        <div className="flex items-start justify-between gap-2">
                            <h3 
                                onClick={(e) => { e.stopPropagation(); onOpenDetails(group); }}
                                className="font-bold text-white text-base sm:text-lg md:text-xl tracking-tight leading-snug line-clamp-2 hover:text-blue-300 transition-colors"
                            >
                                {title}
                            </h3>

                            {/* Options Dropdown Menu */}
                            <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title="More actions"
                                    aria-label="More actions"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#18181a] border border-white/15 rounded-xl shadow-2xl py-1 z-30 backdrop-blur-xl animate-in fade-in duration-150">
                                        {/* Status Options */}
                                        <button
                                            onClick={() => { setIsMenuOpen(false); onPlanToWatch(group); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left"
                                        >
                                            <Plus size={14} className="text-purple-400" /> Plan to watch
                                        </button>
                                        <button
                                            onClick={() => { setIsMenuOpen(false); onMarkWatched(group); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left"
                                        >
                                            <Check size={14} className="text-emerald-400" /> Mark watched
                                        </button>
                                        
                                        <div className="my-1 border-t border-white/10" />

                                        {isNotInterested ? (
                                            <button
                                                onClick={() => { setIsMenuOpen(false); onUpdateTitleStatus(group, 'active'); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left"
                                            >
                                                <RefreshCw size={14} className="text-blue-400" /> Keep in active
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setIsMenuOpen(false); onUpdateTitleStatus(group, 'not_interested'); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-left"
                                            >
                                                <EyeOff size={14} className="text-zinc-400" /> Not interested
                                            </button>
                                        )}

                                        {isArchived ? (
                                            <button
                                                onClick={() => { setIsMenuOpen(false); onUpdateTitleStatus(group, 'active'); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left"
                                            >
                                                <RefreshCw size={14} className="text-blue-400" /> Restore from archive
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setIsMenuOpen(false); onUpdateTitleStatus(group, 'archived'); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-left"
                                            >
                                                <Archive size={14} className="text-yellow-400" /> Archive
                                            </button>
                                        )}

                                        <div className="my-1 border-t border-white/10" />

                                        <button
                                            onClick={() => { setIsMenuOpen(false); onRemoveTitle(group); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                                        >
                                            <Trash2 size={14} /> Remove title
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recommendation Count Pill (Matching Screenshot) */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm">
                                Recommended by {distinctCount} {distinctCount === 1 ? 'friend' : 'friends'}
                            </span>
                            {isNotInterested && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-white/10">
                                    Not interested
                                </span>
                            )}
                            {isArchived && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                    Archived
                                </span>
                            )}
                        </div>

                        {/* Genres / Media Metadata */}
                        {genres && (
                            <p className="text-zinc-400 text-xs sm:text-sm font-medium mt-2 truncate">
                                {genres}
                            </p>
                        )}
                    </div>

                    {/* Friend Avatars and Reveal Trigger */}
                    <div className="mt-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 font-medium">Recommended by</span>
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                                {distinctFriends.slice(0, 5).map((friend, idx) => (
                                    <AvatarItem key={friend?._id || idx} user={friend} size="sm" />
                                ))}
                            </div>
                            {distinctFriends.length > 5 && (
                                <span className="text-[10px] text-zinc-500 font-bold ml-1">
                                    +{distinctFriends.length - 5}
                                </span>
                            )}
                        </div>

                        {/* Revealing Link */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenDetails(group); }}
                            className="text-xs text-zinc-300 hover:text-white transition-colors mt-1.5 font-medium underline-offset-2 hover:underline block text-left"
                        >
                            View recommendations and messages from all {distinctCount} {distinctCount === 1 ? 'friend' : 'friends'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Bar: Status on Left, Action on Right (Matching Screenshot) */}
            <div className="border-t border-white/10 pt-3.5 mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-zinc-400 font-medium">Your status:</span>
                    <span className={`font-semibold ${
                        isStatusWatched 
                            ? 'text-emerald-400' 
                            : isStatusPlanToWatch 
                            ? 'text-purple-300' 
                            : 'text-zinc-300'
                    }`}>
                        {displayStatus}
                    </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {isStatusWatched ? (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <Check size={13} strokeWidth={2.5} />
                            <span>Watched</span>
                        </div>
                    ) : isStatusPlanToWatch ? (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            <Check size={13} strokeWidth={2.5} />
                            <span>In Watchlist</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onPlanToWatch(group)}
                            className="bg-[#1f1f23] hover:bg-white hover:text-black text-white font-bold px-4 py-1.5 rounded-full text-xs transition-all active:scale-95 border border-white/20 shadow-sm"
                        >
                            Plan to watch
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

