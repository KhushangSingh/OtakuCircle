import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotification } from '../components/NotificationProvider';
import { useMediaStatus } from '../contexts/MediaStatusContext';
import axios from 'axios';
import { 
    UserPlus, X, MessageSquare, Check, Film, Trash2,
    Users, UserMinus, Search, Filter, Archive, EyeOff,
    Sparkles, ArrowRight, CheckCircle, Clock, Star, Flame, Lock
} from '../components/icons';
import SearchBar from '../components/SearchBar';
import GroupedRecommendationCard from '../components/GroupedRecommendationCard';
import RecommendationDetailsModal from '../components/RecommendationDetailsModal';
import { groupAndRankRecommendations } from '../utils/recommendationUtils';
import { getValidToken, clearAuth } from '../utils/auth';

export default function Friends() {
    const { showNotification } = useNotification();
    const { animeStatuses, animeWatchlist, setAnimeStatus, setAnimeInWatchlist } = useMediaStatus();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Primary Tab: 'recommendations' | 'friends' | 'requests'
    const activeMainTab = searchParams.get('tab') || 'recommendations';
    const setActiveMainTab = (tab) => {
        setSearchParams({ tab });
    };

    // Social Data State
    const [friends, setFriends] = useState([]);
    const [searchUsers, setSearchUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [activeRequestTab, setActiveRequestTab] = useState('received'); // 'received' or 'sent'
    
    // Recommendations Filter & Search State
    const [recStatusFilter, setRecStatusFilter] = useState('active'); // 'active' | 'multi_friend' | 'all' | 'archived' | 'not_interested'
    const [recSearch, setRecSearch] = useState('');
    const [recFriendFilter, setRecFriendFilter] = useState('all');
    const [recSortBy, setRecSortBy] = useState('most_recommended'); // 'most_recommended' | 'recently_received' | 'highest_rated'

    // Current user's watch history for mutual taste comparison
    const [currentUserWatchhistory, setCurrentUserWatchhistory] = useState([]);

    // Selected Group Modal for Detailed Messages
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Friend Profile Modal State
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendDetails, setFriendDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [friendModalTab, setFriendModalTab] = useState('shared_taste'); // 'shared_taste' | 'recently_watched'
    
    const token = getValidToken();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Summary calculations
    const friendsWithTaste = friends.filter(friend => Number.isFinite(Number(friend.tasteMatch)));
    const averageSharedTaste = friendsWithTaste.length
        ? Math.round(friendsWithTaste.reduce((sum, friend) => sum + Number(friend.tasteMatch), 0) / friendsWithTaste.length)
        : 0;
    const totalFriendWatched = friends.reduce((sum, friend) => sum + Number(friend.watchlistCount || 0), 0);

    // Distinct Recommending Friends List for Filter Dropdown
    const recommendingFriendsList = useMemo(() => {
        const map = new Map();
        (recommendations || []).forEach(r => {
            if (!r.from) return;
            const key = r.from._id?.toString() || r.from.username;
            if (!map.has(key)) {
                map.set(key, { ...r.from, count: 0 });
            }
            map.get(key).count += 1;
        });
        return Array.from(map.values());
    }, [recommendations]);

    // Active Recommendations Count for Tab Badge
    const activeRecsCount = useMemo(() => {
        return (recommendations || []).filter(r => !r.status || r.status === 'active').length;
    }, [recommendations]);

    // All active grouped recommendations (unfiltered) to compute multi-friend endorsement count
    const allActiveGrouped = useMemo(() => {
        return groupAndRankRecommendations(recommendations, { filterStatus: 'active' });
    }, [recommendations]);

    // Count of titles endorsed by multiple friends (distinctCount >= 2)
    const multiFriendGroupedTitles = useMemo(() => {
        return allActiveGrouped.filter(g => g.distinctCount >= 2);
    }, [allActiveGrouped]);

    // Group and Rank recommendations using strict ranking logic
    const groupedRecommendations = useMemo(() => {
        return groupAndRankRecommendations(recommendations, {
            filterStatus: recStatusFilter,
            searchQuery: recSearch,
            friendFilter: recFriendFilter,
            sortBy: recSortBy
        });
    }, [recommendations, recStatusFilter, recSearch, recFriendFilter, recSortBy]);

    // Keep selectedGroup in sync if recommendations state changes
    useEffect(() => {
        if (selectedGroup) {
            const currentGrouped = groupAndRankRecommendations(recommendations, { filterStatus: 'all' });
            const updated = currentGrouped.find(g => g.id === selectedGroup.id);
            if (updated) {
                setSelectedGroup(updated);
            } else {
                setSelectedGroup(null);
            }
        }
    }, [recommendations]);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!token) {
            setLoading(false);
            setFriends([]);
            setFriendRequests([]);
            setSentRequests([]);
            setRecommendations([]);
            return;
        }

        const fetchFriendsData = async () => {
            try {
                const friendsRes = await axios.get(`${API_URL}/friends`, { headers: { Authorization: `Bearer ${token}` } });
                setFriends(friendsRes.data || []);
            } catch (error) { 
                if (error.response?.status === 401) {
                    clearAuth();
                    setFriends([]);
                }
            }
        };

        const fetchRequestsData = async () => {
            try {
                const requestsRes = await axios.get(`${API_URL}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } });
                setFriendRequests(requestsRes.data || []);

                const sentRes = await axios.get(`${API_URL}/friends/requests/sent`, { headers: { Authorization: `Bearer ${token}` } });
                setSentRequests(sentRes.data || []);

                const recsRes = await axios.get(`${API_URL}/recommendations/friends`, { headers: { Authorization: `Bearer ${token}` } });
                setRecommendations(recsRes.data || []);
            } catch (error) { 
                if (error.response?.status === 401) {
                    clearAuth();
                    setFriendRequests([]);
                    setSentRequests([]);
                    setRecommendations([]);
                }
            }
        };

        const fetchCurrentUserHistory = async () => {
            const username = localStorage.getItem('username');
            if (!username) return;
            try {
                const myRes = await axios.get(`${API_URL}/users/${encodeURIComponent(username)}`);
                setCurrentUserWatchhistory(myRes.data?.watchhistory || []);
            } catch (err) {
                // Ignore silent history load failure
            }
        };

        const initialLoad = async () => {
            setLoading(true);
            await Promise.all([fetchFriendsData(), fetchRequestsData(), fetchCurrentUserHistory()]);
            setLoading(false);
        };

        initialLoad();

        const interval = setInterval(() => {
            if (getValidToken()) {
                fetchRequestsData();
                fetchFriendsData(); 
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [token, API_URL]);

    // Compute Mutually Watched Anime and Exchanged Recommendations with Selected Friend
    const mutualData = useMemo(() => {
        if (!friendDetails || !currentUserWatchhistory.length) {
            return { mutuallyWatched: [], exchangedRecs: [] };
        }

        const myWatchedMap = new Map(currentUserWatchhistory.map(item => [item.animeId, item]));
        const mutuallyWatched = (friendDetails.watchhistory || []).filter(item => myWatchedMap.has(item.animeId));
        
        const exchangedRecs = (recommendations || []).filter(r => 
            r.from?._id === friendDetails._id || 
            r.from?.username === friendDetails.username
        );

        return { mutuallyWatched, exchangedRecs };
    }, [friendDetails, currentUserWatchhistory, recommendations]);

    // --- USER SEARCH ACTIONS ---
    const performSearch = async (query) => {
        if (!query || query.trim().length === 0) { setSearchUsers([]); return; }
        try {
            setSearchLoading(true);
            const res = await axios.get(`${API_URL}/search/users?q=${encodeURIComponent(query.trim())}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchUsers(res.data || []);
        } catch (error) { setSearchUsers([]); } 
        finally { setSearchLoading(false); }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (query.trim().length >= 1) await performSearch(query);
        else setSearchUsers([]);
    };

    const handleAddFriend = async (friendId) => {
        try {
            const res = await axios.post(`${API_URL}/friends/request`, { friendId }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification('Friend request sent!', 'success');
            
            const userInSearch = searchUsers.find(u => u._id === friendId);
            if (userInSearch) {
                setSentRequests(prev => [{ _id: res.data.notificationId, recipient: userInSearch }, ...prev]);
            }
        } catch (error) {
            showNotification('Error sending request', 'error');
        }
    };

    const handleCancelRequest = async (friendId) => {
        try {
            await axios.delete(`${API_URL}/friends/request/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
            showNotification('Request cancelled', 'success');
            setSentRequests(prev => prev.filter(req => req.recipient._id !== friendId));
        } catch (error) {
            showNotification('Error cancelling request', 'error');
        }
    };

    const handleAcceptRequest = async (friendId, notificationId) => {
        try {
            await axios.post(`${API_URL}/friends/accept`, { friendId, notificationId }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification('Friend added!', 'success');
            setFriendRequests(prev => prev.filter(req => req._id !== notificationId));
            
            const friendsRes = await axios.get(`${API_URL}/friends`, { headers: { Authorization: `Bearer ${token}` } });
            setFriends(friendsRes.data || []);
        } catch (error) {
            showNotification('Error accepting request', 'error');
        }
    };

    const handleDeclineRequest = async (notificationId) => {
        try {
            await axios.delete(`${API_URL}/friends/decline/${notificationId}`, { headers: { Authorization: `Bearer ${token}` } });
            setFriendRequests(prev => prev.filter(req => req._id !== notificationId));
        } catch (error) {
            showNotification('Error declining request', 'error');
        }
    };

    // --- RECOMMENDATION ACTIONS & TWO-WAY LIBRARY SYNC ---
    const handlePlanToWatch = async (group) => {
        const anime = group.anime || {};
        const rawId = anime.mal_id || group.animeId || group.id;
        const animeId = typeof rawId === 'string' && rawId.includes('_') ? Number(rawId.split('_')[1]) : Number(rawId);
        const title = anime.title || 'Title';
        const isManga = group.mediaType === 'manga' || (anime.type || '').toLowerCase().includes('manga');

        try {
            // Update recommendation status on backend with automatic watchlist sync
            await axios.patch(`${API_URL}/recommendations/anime/${animeId}/status`, {
                status: 'planned'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local recommendations state
            setRecommendations(prev => prev.map(rec => {
                if (Number(rec.anime?.mal_id || rec.animeId) === animeId) {
                    return { ...rec, status: 'planned' };
                }
                return rec;
            }));

            setAnimeInWatchlist(animeId);
            showNotification(`Moved "${title}" to Planned recommendations and added to your Library!`, 'success');
        } catch (error) {
            console.error('Plan error:', error);
            showNotification('Failed to plan recommendation', 'error');
        }
    };

    const handleMarkWatched = async (group) => {
        const anime = group.anime || {};
        const rawId = anime.mal_id || group.animeId || group.id;
        const animeId = typeof rawId === 'string' && rawId.includes('_') ? Number(rawId.split('_')[1]) : Number(rawId);
        const title = anime.title || 'Title';
        const isManga = group.mediaType === 'manga' || (anime.type || '').toLowerCase().includes('manga');

        try {
            // Update recommendation status on backend with automatic library completion sync
            await axios.patch(`${API_URL}/recommendations/anime/${animeId}/status`, {
                status: 'completed'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local recommendations state
            setRecommendations(prev => prev.map(rec => {
                if (Number(rec.anime?.mal_id || rec.animeId) === animeId) {
                    return { ...rec, status: 'completed' };
                }
                return rec;
            }));

            setAnimeStatus(animeId, isManga ? 'Completed' : 'Watched');
            showNotification(`Marked "${title}" as Completed! Updated your Library.`, 'success');
        } catch (error) {
            console.error('Mark completed error:', error);
            showNotification('Failed to mark as completed', 'error');
        }
    };

    const handleUpdateIndividualStatus = async (recId, newStatus) => {
        setRecommendations(prev => prev.map(rec => {
            if (rec._id === recId) return { ...rec, status: newStatus };
            return rec;
        }));

        try {
            await axios.patch(`${API_URL}/recommendations/${recId}/status`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const statusLabel = newStatus === 'active' ? 'Active' : newStatus === 'not_interested' ? 'Not Interested' : 'Archived';
            showNotification(`Recommendation marked as ${statusLabel}`, 'success');
        } catch (error) {
            showNotification('Failed to update status', 'error');
        }
    };

    const handleRemoveIndividual = async (recId) => {
        setRecommendations(prev => prev.filter(rec => rec._id !== recId));
        try {
            await axios.delete(`${API_URL}/recommendations/${recId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showNotification('Recommendation removed', 'success');
        } catch (error) {
            showNotification('Failed to delete recommendation', 'error');
        }
    };

    const handleUpdateTitleStatus = async (group, newStatus) => {
        const rawId = group.anime?.mal_id || group.animeId || group.id;
        const animeId = typeof rawId === 'string' && rawId.includes('_') ? Number(rawId.split('_')[1]) : Number(rawId);
        const title = group.anime?.title || 'Title';

        setRecommendations(prev => prev.map(rec => {
            if (rec.anime?.mal_id === animeId || rec.animeId === animeId) {
                return { ...rec, status: newStatus };
            }
            return rec;
        }));

        try {
            await axios.patch(`${API_URL}/recommendations/anime/${animeId}/status`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const label = newStatus === 'active' ? 'kept in active' : newStatus === 'not_interested' ? 'marked as not interested' : 'archived';
            showNotification(`"${title}" ${label}`, 'success');
        } catch (error) {
            showNotification('Failed to update title recommendations', 'error');
        }
    };

    const handleRemoveTitle = async (group) => {
        const animeId = group.anime?.mal_id || group.id;
        const title = group.anime?.title || 'Title';

        setRecommendations(prev => prev.filter(rec => (rec.anime?.mal_id !== animeId && rec.animeId !== animeId)));
        setSelectedGroup(null);

        try {
            await axios.delete(`${API_URL}/recommendations/anime/${animeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showNotification(`Removed all recommendations for "${title}"`, 'success');
        } catch (error) {
            showNotification('Failed to delete title recommendations', 'error');
        }
    };

    // --- FRIEND PROFILE MODAL ---
    const handleFriendClick = async (friend) => {
        setSelectedFriend(friend);
        setLoadingDetails(true);
        setFriendModalTab('shared_taste');
        try {
            const res = await axios.get(`${API_URL}/users/${friend.username}`);
            setFriendDetails(res.data);
        } catch (error) { 
            showNotification('Error loading details', 'error'); 
        } finally { 
            setLoadingDetails(false); 
        }
    };

    const closeModal = () => {
        setSelectedFriend(null);
        setFriendDetails(null);
    };

    const Avatar = ({ user, size = 'md', className = '' }) => {
        const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-24 h-24 text-3xl' };
        if (user?.profilePicture) {
            return (
                <img src={user.profilePicture} alt={user.username} className={`${sizes[size]} rounded-full object-cover bg-zinc-800 ${className}`} />
            );
        }
        return (
            <div className={`${sizes[size]} bg-gradient-to-t from-zinc-800 to-zinc-700 rounded-full flex items-center justify-center text-white font-bold border border-white/10 ${className}`}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-[#e1e2ec] font-sans selection:bg-white/20 pt-24 pb-16">
            <main className="px-4 sm:px-6 md:px-8 max-w-[1400px] mx-auto w-full">
                
                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Social Hub
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            Discover peer-endorsed anime, compare watch tastes, and manage received recommendations.
                        </p>
                    </div>

                    {/* Quick Friend Search Bar */}
                    <div className="relative w-full md:w-80">
                        <SearchBar
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Find fellow otakus..."
                        />
                        
                        {search.trim().length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                                {searchLoading ? (
                                    <div className="p-4 text-zinc-500 text-sm text-center">Searching...</div>
                                ) : searchUsers.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-2 pt-2 pb-1">Users</p>
                                        {searchUsers.map(user => {
                                            const isFriend = friends.some(f => f._id === user._id);
                                            const isSent = sentRequests.some(req => req.recipient?._id === user._id);
                                            
                                            return (
                                                <div key={user._id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <Avatar user={user} size="sm" />
                                                        <span className="text-sm font-medium text-white truncate">{user.username}</span>
                                                    </div>
                                                    {isFriend ? (
                                                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/20">Friends</span>
                                                    ) : isSent ? (
                                                        <button 
                                                            onClick={() => handleCancelRequest(user._id)} 
                                                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" 
                                                            title="Cancel Request"
                                                        >
                                                            <UserMinus size={14} />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleAddFriend(user._id)} 
                                                            className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors" 
                                                            title="Send Request"
                                                        >
                                                            <UserPlus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 text-zinc-500 text-sm text-center">No users found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* ============================================================ */}
                {/* SOCIAL ANALYTICS DASHBOARD (Answers the 2 key questions)     */}
                {/* ============================================================ */}
                <section className="mb-8 rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                                Circle Social Analytics
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Honest metrics connecting peer recommendations and circle taste.
                            </p>
                        </div>

                        {multiFriendGroupedTitles.length > 0 && (
                            <button
                                onClick={() => {
                                    setActiveMainTab('recommendations');
                                    setRecStatusFilter(recStatusFilter === 'multi_friend' ? 'active' : 'multi_friend');
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    recStatusFilter === 'multi_friend' 
                                        ? 'bg-purple-600 text-white border-purple-500' 
                                        : 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                                }`}
                            >
                                {multiFriendGroupedTitles.length} Multi-Friend {multiFriendGroupedTitles.length === 1 ? 'Endorsement' : 'Endorsements'}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {/* 1. What have my friends recommended to me? */}
                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                            
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Recs Received</p>
                                <p className="mt-1 text-2xl font-black text-white">{recommendations.length}</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">{activeRecsCount} active in inbox</p>
                            </div>
                        </div>

                        {/* 2. Which titles are recommended by multiple friends? */}
                        <div 
                            onClick={() => {
                                setActiveMainTab('recommendations');
                                setRecStatusFilter('multi_friend');
                            }}
                            className="rounded-2xl border border-white/5 bg-white/[0.02] hover:border-purple-500/30 p-4 flex flex-col justify-between cursor-pointer transition-all group"
                            title="Click to view multi-friend titles"
                        >
                            
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Multi-Friend Endorsed</p>
                                <p className="mt-1 text-2xl font-black text-purple-300">{multiFriendGroupedTitles.length}</p>
                                <p className="text-[11px] text-purple-400/80 mt-0.5 group-hover:underline">Recommended by 2+ friends →</p>
                            </div>
                        </div>

                        {/* 3. Friend Comparisons & Shared Taste */}
                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                            
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Avg Circle Taste</p>
                                <p className="mt-1 text-2xl font-black text-emerald-400">{averageSharedTaste}%</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Taste alignment</p>
                            </div>
                        </div>

                        {/* 4. Friends in Circle */}
                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                            
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Circle Friends</p>
                                <p className="mt-1 text-2xl font-black text-white">{friends.length}</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">{totalFriendWatched} titles watched by friends</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Primary Navigation Tabs */}
                <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveMainTab('recommendations')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                            activeMainTab === 'recommendations'
                                ? 'bg-white text-black shadow-lg shadow-white/10'
                                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                    >
                        <span>Recommendations</span>
                        {activeRecsCount > 0 && (
                            <span className={`px-2 py-0.2 rounded-full text-xs font-black ${
                                activeMainTab === 'recommendations' 
                                    ? 'bg-black/15 text-black' 
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                                {activeRecsCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveMainTab('friends')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                            activeMainTab === 'friends'
                                ? 'bg-white text-black shadow-lg shadow-white/10'
                                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                    >
                        <span>My Friends</span>
                        <span className={`px-2 py-0.2 rounded-full text-xs font-bold ${
                            activeMainTab === 'friends' ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-400'
                        }`}>
                            {friends.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveMainTab('requests')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                            activeMainTab === 'requests'
                                ? 'bg-white text-black shadow-lg shadow-white/10'
                                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                    >
                        <span>Friend Requests</span>
                        {friendRequests.length > 0 && (
                            <span className={`px-2 py-0.2 rounded-full text-xs font-black ${
                                activeMainTab === 'requests' 
                                    ? 'bg-black/15 text-black' 
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                                {friendRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ============================================================ */}
                {/* TAB 1: RECOMMENDATIONS (Grouped & Ranked by Title)           */}
                {/* ============================================================ */}
                {activeMainTab === 'recommendations' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        
                        {/* Recommendations Toolbar: Filter, Search, Friend, Sort */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                            
                            {/* Status Sub-Filters */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
                                {[
                                    ['active', 'All Active'],
                                    ['multi_friend', `Multi-Friend (${multiFriendGroupedTitles.length})`],
                                    ['planned', 'Planned'],
                                    ['completed', 'Completed'],
                                    ['archived', 'Archived'],
                                    ['not_interested', 'Not Interested'],
                                    ['all', 'All Received']
                                ].map(([statusKey, label]) => (
                                    <button
                                        key={statusKey}
                                        onClick={() => setRecStatusFilter(statusKey)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                            recStatusFilter === statusKey
                                                ? 'bg-blue-600/90 text-white shadow-md shadow-blue-900/30'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Search, Friend Filter & Sort Controls */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                
                                {/* Search recommendations */}
                                <div className="relative min-w-[200px] flex-1 sm:flex-none">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={recSearch}
                                        onChange={(e) => setRecSearch(e.target.value)}
                                        placeholder="Search titles or notes..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                    />
                                    {recSearch && (
                                        <button 
                                            onClick={() => setRecSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Filter by Friend */}
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        value={recFriendFilter}
                                        onChange={(e) => setRecFriendFilter(e.target.value)}
                                        className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer"
                                    >
                                        <option value="all">All Friends</option>
                                        {recommendingFriendsList.map(f => (
                                            <option key={f._id || f.username} value={f._id || f.username}>
                                                {f.username} ({f.count})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort Options */}
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        value={recSortBy}
                                        onChange={(e) => setRecSortBy(e.target.value)}
                                        className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer"
                                    >
                                        <option value="most_recommended">Most Recommended</option>
                                        <option value="recently_received">Recently Received</option>
                                        <option value="highest_rated">Highest Rated</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Title Cards Grid */}
                        {loading ? (
                            <div className="py-20 text-center text-zinc-500 text-sm">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                Loading your recommendations...
                            </div>
                        ) : groupedRecommendations.length === 0 ? (
                            <div className="py-20 px-4 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center max-w-lg mx-auto">
                                
                                <h3 className="text-white font-bold text-base mb-1">
                                    {recSearch 
                                        ? `No recommendations match "${recSearch}"`
                                        : recStatusFilter === 'multi_friend'
                                        ? 'No multi-friend recommendations yet'
                                        : recStatusFilter === 'archived'
                                        ? 'No archived recommendations'
                                        : recStatusFilter === 'not_interested'
                                        ? 'No titles marked as not interested'
                                        : 'No active recommendations yet'}
                                </h3>
                                <p className="text-zinc-500 text-xs max-w-sm mb-5">
                                    {recSearch
                                        ? 'Try searching by a different anime title, genre, or friend username.'
                                        : recStatusFilter === 'multi_friend'
                                        ? 'When two or more friends recommend the same anime, it appears in this top-endorsed view.'
                                        : 'When friends recommend an anime or movie to you, it will appear here grouped neatly under its canonical title card.'}
                                </p>
                                {recSearch ? (
                                    <button
                                        onClick={() => setRecSearch('')}
                                        className="px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors"
                                    >
                                        Clear Search Filter
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setActiveMainTab('friends')}
                                        className="px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors inline-flex items-center gap-1.5"
                                    >
                                        Explore Friends List <ArrowRight size={13} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {groupedRecommendations.map(group => (
                                    <GroupedRecommendationCard
                                        key={group.id}
                                        group={group}
                                        onOpenDetails={(grp) => setSelectedGroup(grp)}
                                        onPlanToWatch={handlePlanToWatch}
                                        onMarkWatched={handleMarkWatched}
                                        onUpdateTitleStatus={handleUpdateTitleStatus}
                                        onRemoveTitle={handleRemoveTitle}
                                        trackingStatus={animeStatuses[group.anime?.mal_id || group.id]}
                                        inWatchlist={Boolean(animeWatchlist[group.anime?.mal_id || group.id])}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB 2: MY FRIENDS LIST & COMMUNITY                           */}
                {/* ============================================================ */}
                {activeMainTab === 'friends' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                                        Your Circle ({friends.length})
                                    </h2>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-12 text-zinc-500">Loading friends...</div>
                            ) : friends.length === 0 ? (
                                <div className="text-center py-16 text-zinc-500 bg-white/[0.02] rounded-3xl border border-white/5 max-w-md mx-auto p-6">
                                    
                                    <p className="text-sm font-semibold text-zinc-400 mb-1">You haven't added any friends yet</p>
                                    <p className="text-xs text-zinc-600 mb-4">Use the search bar at the top to discover other otakus and share recommendations!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {friends.map(friend => (
                                        <div key={friend._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-3.5 hover:border-white/15 transition-all">
                                            <Avatar user={friend} size="md" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-semibold text-sm truncate">{friend.username}</h3>
                                                {friend.tasteMatch !== null && (
                                                    <p className="text-[11px] font-medium text-blue-400/90 flex items-center gap-1 mt-0.5">
                                                        {friend.tasteMatch}% Shared Taste
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleFriendClick(friend)}
                                                className="shrink-0 rounded-xl bg-blue-600/90 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                                            >
                                                View Taste & Profile
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB 3: FRIEND REQUESTS (Received & Sent)                     */}
                {/* ============================================================ */}
                {activeMainTab === 'requests' && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                                    Friend Requests
                                </h2>
                            </div>

                            <div className="flex gap-2 mb-6 bg-black/40 p-1 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setActiveRequestTab('received')}
                                    className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all ${
                                        activeRequestTab === 'received' 
                                            ? 'bg-white/15 text-white shadow-md' 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Received ({friendRequests.length})
                                </button>
                                <button 
                                    onClick={() => setActiveRequestTab('sent')}
                                    className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all ${
                                        activeRequestTab === 'sent' 
                                            ? 'bg-white/15 text-white shadow-md' 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Sent ({sentRequests.length})
                                </button>
                            </div>

                            <div className="space-y-3">
                                {activeRequestTab === 'received' ? (
                                    friendRequests.length === 0 ? (
                                        <div className="py-12 text-center text-zinc-500 text-sm">
                                            No pending requests received
                                        </div>
                                    ) : (
                                        friendRequests.map(req => (
                                            <div key={req._id} className="flex items-center gap-3 bg-black/30 p-3.5 rounded-2xl border border-white/5">
                                                <Avatar user={req.sender} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{req.sender?.username}</p>
                                                    {req.tasteMatch !== null && (
                                                        <p className="text-blue-400 text-xs truncate flex items-center gap-1 mt-0.5">
                                                            {req.tasteMatch}% Shared Taste
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleAcceptRequest(req.sender?._id, req._id)} 
                                                        className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
                                                        title="Accept"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeclineRequest(req._id)} 
                                                        className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                                        title="Decline"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    sentRequests.length === 0 ? (
                                        <div className="py-12 text-center text-zinc-500 text-sm">
                                            No pending requests sent
                                        </div>
                                    ) : (
                                        sentRequests.map(req => (
                                            <div key={req._id} className="flex items-center gap-3 bg-black/30 p-3.5 rounded-2xl border border-white/5">
                                                <Avatar user={req.recipient} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{req.recipient?.username}</p>
                                                    {req.tasteMatch !== null && (
                                                        <p className="text-blue-400 text-xs truncate flex items-center gap-1 mt-0.5">
                                                            {req.tasteMatch}% Shared Taste
                                                        </p>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => handleCancelRequest(req.recipient?._id)} 
                                                    className="w-9 h-9 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" 
                                                    title="Cancel Request"
                                                >
                                                    <UserMinus size={15} />
                                                </button>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ============================================================ */}
            {/* RECOMMENDATION DETAILS MODAL (REVEALS MESSAGES PER FRIEND)    */}
            {/* ============================================================ */}
            {selectedGroup && (
                <RecommendationDetailsModal
                    group={selectedGroup}
                    onClose={() => setSelectedGroup(null)}
                    onPlanToWatch={handlePlanToWatch}
                    onMarkWatched={handleMarkWatched}
                    onUpdateIndividualStatus={handleUpdateIndividualStatus}
                    onRemoveIndividual={handleRemoveIndividual}
                    onUpdateTitleStatus={handleUpdateTitleStatus}
                    onRemoveTitle={handleRemoveTitle}
                    trackingStatus={animeStatuses[selectedGroup.anime?.mal_id || selectedGroup.id]}
                    inWatchlist={Boolean(animeWatchlist[selectedGroup.anime?.mal_id || selectedGroup.id])}
                />
            )}

            {/* ============================================================ */}
            {/* FRIEND PROFILE & OUR SHARED ANIME TASTE MODAL                */}
            {/* ============================================================ */}
            {selectedFriend && friendDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal}>
                    <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-3xl border border-white/10 bg-[#121212] backdrop-blur-3xl" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Close button */}
                        <button onClick={closeModal} className="absolute top-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-md rounded-full border border-white/10 transition-all duration-300 group">
                            <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        {loadingDetails ? (
                            <div className="w-full h-80 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Profile Left Sidebar */}
                                <div className="w-full md:w-[32%] relative flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
                                    <div className="relative z-10 flex flex-col items-center text-center w-full">
                                        <div className="p-1 rounded-full border border-white/10 shadow-xl mb-3 bg-black/50">
                                            <Avatar user={friendDetails} size="xl" className="w-20 h-20" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-md truncate max-w-full">
                                            {friendDetails.username}
                                        </h2>
                                        
                                        {/* Taste Match Badge */}
                                        {(friendDetails.tasteMatch !== null || selectedFriend.tasteMatch !== null) && (
                                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                <Sparkles size={12} /> {friendDetails.tasteMatch || selectedFriend.tasteMatch}% Shared Taste
                                            </div>
                                        )}

                                        <p className="text-[11px] text-zinc-500 mt-3 flex items-center gap-1">
                                            <Lock size={10} /> Connected Friend Profile
                                        </p>
                                    </div>
                                </div>

                                {/* Main Right Panel with Tabs: "Our Shared Anime Taste" vs "Recently Watched" */}
                                <div className="w-full md:w-[68%] p-6 flex flex-col overflow-hidden bg-black/20">
                                    
                                    {/* Sub-Tabs */}
                                    <div className="flex items-center gap-2 mb-4 bg-white/[0.03] p-1 rounded-xl border border-white/5 shrink-0 pr-10">
                                        <button
                                            onClick={() => setFriendModalTab('shared_taste')}
                                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                                                friendModalTab === 'shared_taste'
                                                    ? 'bg-blue-600/90 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            Our Shared Anime Taste
                                        </button>
                                        <button
                                            onClick={() => setFriendModalTab('recently_watched')}
                                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                                                friendModalTab === 'recently_watched'
                                                    ? 'bg-blue-600/90 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            Recently Watched ({friendDetails.watchhistory?.length || 0})
                                        </button>
                                    </div>

                                    {/* TAB CONTENT: Our Shared Anime Taste */}
                                    {friendModalTab === 'shared_taste' && (
                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                                            
                                            {/* Taste Affinity Highlights */}
                                            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                        Mutual Discovery
                                                    </span>
                                                    <span className="text-[10px] text-purple-300 font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                                                        Vector Match
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-300">
                                                    You and <strong className="text-white">{friendDetails.username}</strong> share a <strong className="text-purple-300">{friendDetails.tasteMatch || selectedFriend.tasteMatch}%</strong> taste alignment based on your completed and rated titles.
                                                </p>
                                            </div>

                                            {/* Mutually Watched Anime */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2 px-1">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                                        Mutually Watched Titles ({mutualData.mutuallyWatched.length})
                                                    </h4>
                                                </div>

                                                {mutualData.mutuallyWatched.length > 0 ? (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                        {mutualData.mutuallyWatched.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/5 rounded-xl hover:border-white/15 transition-all">
                                                                {item.poster ? (
                                                                    <img src={item.poster} alt={item.title} className="w-9 h-12 object-cover rounded-lg bg-zinc-800 shrink-0" />
                                                                ) : (
                                                                    <div className="w-9 h-12 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center">
                                                                        <Film size={14} className="text-zinc-600" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                                                    <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Watched by both of you ✓</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                                                        <p className="text-xs text-zinc-500">
                                                            No mutually watched titles logged yet. Recommend an anime to start sharing your journey!
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recommendations Exchanged */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2 px-1">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                                        Recommendations from {friendDetails.username} ({mutualData.exchangedRecs.length})
                                                    </h4>
                                                </div>

                                                {mutualData.exchangedRecs.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {mutualData.exchangedRecs.map(rec => (
                                                            <div key={rec._id} className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate">{rec.anime?.title || rec.animeTitle}</p>
                                                                    {rec.message && (
                                                                        <p className="text-[11px] text-zinc-400 italic truncate mt-0.5">"{rec.message}"</p>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
                                                                    Recommended
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center rounded-xl bg-white/[0.01] border border-dashed border-white/5">
                                                        <p className="text-xs text-zinc-500">No recommendations received from {friendDetails.username} yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB CONTENT: Recently Watched */}
                                    {friendModalTab === 'recently_watched' && (
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                                    Watch Activity
                                                </h3>
                                                {friendDetails.watchhistory && friendDetails.watchhistory.length > 0 && (
                                                    <button 
                                                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors" 
                                                        onClick={() => navigate(`/friends/${friendDetails.username}/watched`)}
                                                    >
                                                        See All →
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                                                {friendDetails.watchhistory && friendDetails.watchhistory.length > 0 ? (
                                                    friendDetails.watchhistory.slice().reverse().map((item, idx) => (
                                                        <div key={idx} className="group flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all cursor-default shrink-0">
                                                            {item.poster ? <img src={item.poster} className="w-8 h-11 object-cover rounded-md" /> : <div className="w-8 h-11 bg-zinc-800 rounded-md"></div>}
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                <p className="font-bold text-white text-xs truncate">{item.title}</p>
                                                                <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">{item.status}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                                                        <p className="text-zinc-600 text-sm">No recent activity.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
