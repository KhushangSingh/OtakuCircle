import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    X, Plus, Check, Trash2, Archive, EyeOff, 
    RefreshCw, Film, ExternalLink, Star 
} from './icons';
import { formatTimeAgo } from '../utils/recommendationUtils';

const FriendAvatar = ({ user, size = 'md' }) => {
    if (user?.profilePicture) {
        return (
            <img 
                src={user.profilePicture} 
                alt={user.username || 'Friend'} 
                className={`${size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'} rounded-full object-cover bg-zinc-800 border border-white/10`} 
            />
        );
    }
    return (
        <div className={`${size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'} bg-gradient-to-t from-zinc-800 to-zinc-700 rounded-full flex items-center justify-center text-white font-bold border border-white/10`}>
            {user?.username?.charAt(0).toUpperCase() || 'F'}
        </div>
    );
};

export default function RecommendationDetailsModal({
    group,
    onClose,
    onPlanToWatch,
    onMarkWatched,
    onUpdateIndividualStatus,
    onRemoveIndividual,
    onUpdateTitleStatus,
    onRemoveTitle,
    trackingStatus,
    inWatchlist
}) {
    const navigate = useNavigate();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!group) return null;

    const anime = group.anime || {};
    const title = anime.title || 'Unknown Title';
    const poster = anime.poster_url;
    const genres = anime.genres || [];
    const score = anime.score;
    const distinctCount = group.distinctCount || 1;
    const records = group.records || [];

    const isManga = group.mediaType === 'manga' || (anime.type || '').toLowerCase().includes('manga');
    const mediaNoun = isManga ? 'Manga' : 'Anime';
    const planActionLabel = isManga ? 'Plan to read' : 'Plan to watch';
    const completeActionLabel = isManga ? 'Mark read' : 'Mark watched';

    const isStatusWatched = trackingStatus === 'Watched' || trackingStatus === 'Completed';
    const isStatusPlanToWatch = inWatchlist || trackingStatus === 'Plan to watch' || trackingStatus === 'Plan to read';
    const currentStatusDisplay = trackingStatus || (inWatchlist ? (isManga ? 'Plan to read' : 'Plan to watch') : 'Not started');

    const handleOpenAnimePage = () => {
        onClose();
        const rawId = anime.mal_id || group.animeId || group.id;
        const targetId = typeof rawId === 'string' && rawId.includes('_') ? rawId.split('_')[1] : rawId;
        if (targetId) navigate(`/anime/${targetId}`);
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-2xl max-h-[90vh] bg-[#121212]/90 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
                    title="Close"
                    aria-label="Close modal"
                >
                    <X size={16} />
                </button>

                {/* Header / Media Summary */}
                <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent flex gap-4 sm:gap-5 items-start">
                    {/* Poster */}
                    <div 
                        onClick={handleOpenAnimePage}
                        className="w-20 sm:w-24 aspect-[2/3] rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/10 bg-zinc-900 cursor-pointer group"
                        title={`Open ${mediaNoun} details`}
                    >
                        {poster ? (
                            <img src={poster} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                                <Film size={24} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                {mediaNoun}
                            </span>
                            <span className="text-xs text-zinc-400 font-medium">
                                Recommended by <strong className="text-white font-bold">{distinctCount}</strong> {distinctCount === 1 ? 'friend' : 'friends'}
                            </span>
                        </div>

                        <h3 
                            onClick={handleOpenAnimePage}
                            className="text-lg sm:text-xl font-bold text-white hover:text-blue-300 transition-colors leading-snug line-clamp-2 cursor-pointer"
                        >
                            {title}
                        </h3>

                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                            {score && score !== 'N/A' && (
                                <span className="flex items-center gap-1 text-yellow-400 font-bold">
                                    <Star size={12} fill="currentColor" /> {score}
                                </span>
                            )}
                            {genres.length > 0 && (
                                <span className="truncate max-w-[280px]">
                                    {genres.slice(0, 3).join(' · ')}
                                </span>
                            )}
                        </div>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleOpenAnimePage}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
                            >
                                View full details <ExternalLink size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Personal Watch Status Control Bar */}
                <div className="px-5 sm:px-6 py-3 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Library status:</span>
                        <span className={`font-semibold ${
                            isStatusWatched ? 'text-emerald-400' : isStatusPlanToWatch ? 'text-purple-300' : 'text-zinc-300'
                        }`}>
                            {currentStatusDisplay}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isStatusPlanToWatch && !isStatusWatched && (
                            <button
                                onClick={() => onPlanToWatch(group)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors active:scale-95 shadow-sm cursor-pointer"
                            >
                                <Plus size={13} strokeWidth={2.5} /> {planActionLabel}
                            </button>
                        )}
                        {!isStatusWatched && (
                            <button
                                onClick={() => onMarkWatched(group)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                            >
                                <Check size={13} strokeWidth={2.5} /> {completeActionLabel}
                            </button>
                        )}
                    </div>
                </div>

                {/* Individual Recommendations List */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Friend Recommendations & Notes ({records.length})
                        </h4>
                        <span className="text-[11px] text-zinc-500">
                            Individual notes & dates preserved
                        </span>
                    </div>

                    <div className="space-y-3">
                        {records.map((rec) => {
                            const isRecNotInterested = rec.status === 'not_interested';
                            const isRecArchived = rec.status === 'archived';
                            const isRecPlanned = rec.status === 'planned';
                            const isRecCompleted = rec.status === 'completed';
                            const timeAgo = formatTimeAgo(rec.timestamp);

                            return (
                                <div 
                                    key={rec._id} 
                                    className={`p-4 rounded-2xl border transition-all ${
                                        isRecNotInterested 
                                            ? 'bg-zinc-900/40 border-white/5 opacity-60 hover:opacity-100' 
                                            : isRecArchived 
                                            ? 'bg-zinc-900/50 border-yellow-500/15' 
                                            : isRecPlanned
                                            ? 'bg-purple-950/20 border-purple-500/30'
                                            : isRecCompleted
                                            ? 'bg-emerald-950/20 border-emerald-500/30'
                                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {/* Friend Header */}
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <FriendAvatar user={rec.from} size="sm" />
                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {rec.from?.username || 'Friend'}
                                                </p>
                                                {timeAgo && (
                                                    <p className="text-[11px] text-zinc-500 font-medium">
                                                        {timeAgo}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {isRecPlanned && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                    Planned
                                                </span>
                                            )}
                                            {isRecCompleted && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    Completed
                                                </span>
                                            )}
                                            {isRecNotInterested && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/10">
                                                    Not interested
                                                </span>
                                            )}
                                            {isRecArchived && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Personal Note */}
                                    {rec.message ? (
                                        <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-xs text-zinc-300 leading-relaxed font-normal">
                                            "{rec.message}"
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-500 italic">
                                            Recommended without a note.
                                        </p>
                                    )}

                                    {/* Per-friend actions */}
                                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                                        <div className="flex items-center gap-2">
                                            {rec.status !== 'active' && (
                                                <button
                                                    onClick={() => onUpdateIndividualStatus(rec._id, 'active')}
                                                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                                                    title="Restore to Active"
                                                >
                                                    <RefreshCw size={11} /> Restore
                                                </button>
                                            )}
                                            {rec.status !== 'archived' && (
                                                <button
                                                    onClick={() => onUpdateIndividualStatus(rec._id, 'archived')}
                                                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                                                    title="Archive"
                                                >
                                                    <Archive size={11} /> Archive
                                                </button>
                                            )}
                                            {rec.status !== 'not_interested' && (
                                                <button
                                                    onClick={() => onUpdateIndividualStatus(rec._id, 'not_interested')}
                                                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                                                    title="Mark not interested"
                                                >
                                                    <EyeOff size={11} /> Not interested
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => onRemoveIndividual(rec._id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 font-medium transition-colors cursor-pointer"
                                            title="Remove this recommendation"
                                        >
                                            <Trash2 size={11} /> Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Bar: Title-level bulk controls */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {group.groupStatus !== 'active' && (
                            <button
                                onClick={() => onUpdateTitleStatus(group, 'active')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} /> Restore to Active
                            </button>
                        )}

                        {group.groupStatus !== 'archived' && (
                            <button
                                onClick={() => onUpdateTitleStatus(group, 'archived')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <Archive size={13} /> Archive
                            </button>
                        )}

                        {group.groupStatus !== 'not_interested' && (
                            <button
                                onClick={() => onUpdateTitleStatus(group, 'not_interested')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <EyeOff size={13} /> Not interested
                            </button>
                        )}

                        <button
                            onClick={() => onRemoveTitle(group)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                        >
                            <Trash2 size={13} /> Remove
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
