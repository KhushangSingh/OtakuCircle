import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../components/NotificationProvider';
import axios from 'axios';
import { 
    UserPlus, Search, X, User, MessageSquare, Check, XCircle, Film, Trash2,
    Users, Compass, MoreVertical, VideoOff, MessageCircle, Info, UserMinus
} from 'lucide-react';

const Friends = () => {
    const { showNotification } = useNotification();
    const [friends, setFriends] = useState([]);
    const [searchUsers, setSearchUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [activeRequestTab, setActiveRequestTab] = useState('received'); // 'received' or 'sent'
    
    // Modal State
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendDetails, setFriendDetails] = useState(null);
    const navigate = useNavigate();
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchFriendsData = async () => {
            try {
                const friendsRes = await axios.get(`${API_URL}/friends`, { headers: { Authorization: `Bearer ${token}` } });
                setFriends(friendsRes.data || []);
            } catch (error) { console.error(error); }
        };

        const fetchRequestsData = async () => {
            try {
                const requestsRes = await axios.get(`${API_URL}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } });
                setFriendRequests(requestsRes.data || []);

                const sentRes = await axios.get(`${API_URL}/friends/requests/sent`, { headers: { Authorization: `Bearer ${token}` } });
                setSentRequests(sentRes.data || []);

                const recsRes = await axios.get(`${API_URL}/recommendations/friends`, { headers: { Authorization: `Bearer ${token}` } });
                setRecommendations(recsRes.data || []);
            } catch (error) { console.error(error); }
        };

        const initialLoad = async () => {
            setLoading(true);
            await Promise.all([fetchFriendsData(), fetchRequestsData()]);
            setLoading(false);
        };

        initialLoad();

        // Real-time polling every 10 seconds
        const interval = setInterval(() => {
            fetchRequestsData();
            // Optional: fetchFriendsData() if we want friend status to be real-time too
            fetchFriendsData(); 
        }, 10000);

        return () => clearInterval(interval);
    }, [token, API_URL]);

    // --- SEARCH ACTIONS ---
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
            showNotification('Request sent!', 'success');
            
            // Add to sentRequests so UI updates immediately
            const userInSearch = searchUsers.find(u => u._id === friendId);
            if (userInSearch) {
                setSentRequests(prev => [{ _id: res.data.notificationId, recipient: userInSearch }, ...prev]);
            }
        } catch (error) {
            showNotification('Error sending request', 'error');
        }
    };

    const handleCancelRequest = async (friendId, notificationId) => {
        try {
            await axios.delete(`${API_URL}/friends/request/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
            showNotification('Request cancelled', 'success');
            
            // Remove from sentRequests
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
            
            // Refetch friends
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

    const handleDeleteRecommendation = async (recId, e) => {
        e.stopPropagation(); 
        setRecommendations(prev => prev.filter(rec => rec._id !== recId));
        try {
            await axios.delete(`${API_URL}/recommendations/${recId}`, { headers: { Authorization: `Bearer ${token}` } });
            showNotification('Recommendation removed', 'success');
        } catch (error) {
            showNotification('Failed to delete', 'error');
        }
    };

    const handleFriendClick = async (friend) => {
        setSelectedFriend(friend);
        setLoadingDetails(true);
        try {
            const res = await axios.get(`${API_URL}/users/${friend.username}`);
            setFriendDetails(res.data);
        } catch (error) { showNotification('Error loading details', 'error'); } 
        finally { setLoadingDetails(false); }
    };

    const closeModal = () => {
        setSelectedFriend(null);
        setFriendDetails(null);
    };

    // --- UTILS ---
    const getTasteMatch = (userId) => {
        if (!userId) return 0;
        let seed = 0;
        for (let i = 0; i < userId.length; i++) seed += userId.charCodeAt(i);
        return (seed % 60) + 40; 
    };
    
    const getLastActive = (userId) => {
        if (!userId) return "Just now";
        let seed = 0;
        for (let i = 0; i < userId.length; i++) seed += userId.charCodeAt(i);
        const hours = seed % 24;
        const mins = seed % 60;
        if (hours === 0) return `${mins}m ago`;
        return `${hours}h ago`;
    };

    // --- AVATAR COMPONENT ---
    const Avatar = ({ user, size = 'md', className = '' }) => {
        const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-32 h-32 text-4xl' };
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
        <div className="min-h-screen bg-[#0d0d0d] text-[#e1e2ec] font-sans selection:bg-white/20 pt-20 pb-10">
            <main className="p-6 md:p-8 max-w-[1400px] mx-auto w-full">
                
                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Social Hub</h1>
                        <p className="text-zinc-400 text-sm">Connect, Share, and Discover.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                        <input 
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 outline-none" 
                            placeholder="Find friends..." 
                            type="text"
                        />
                        
                        {/* Search Dropdown */}
                        {search.trim().length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                                {searchLoading ? (
                                    <div className="p-4 text-zinc-500 text-sm text-center">Searching...</div>
                                ) : searchUsers.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-2 pt-2 pb-1">Results</p>
                                        {searchUsers.map(user => {
                                            const isFriend = friends.some(f => f._id === user._id);
                                            const isSent = sentRequests.some(req => req.recipient?._id === user._id);
                                            
                                            return (
                                                <div key={user._id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar user={user} size="sm" />
                                                        <span className="text-sm font-medium text-white">{user.username}</span>
                                                    </div>
                                                    {isFriend ? (
                                                        <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/20 px-2 py-1 rounded-full">Friends</span>
                                                    ) : isSent ? (
                                                        <button onClick={() => handleCancelRequest(user._id)} className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Cancel Request">
                                                            <UserMinus size={14} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleAddFriend(user._id)} className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors" title="Send Request">
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

                {/* Top Row: Friend Requests & Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    
                    {/* Friend Requests (Tabbed) */}
                    <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <UserPlus className="text-yellow-500 w-4 h-4" />
                                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Requests</h2>
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4 bg-black/20 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveRequestTab('received')}
                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${activeRequestTab === 'received' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Received ({friendRequests.length})
                            </button>
                            <button 
                                onClick={() => setActiveRequestTab('sent')}
                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${activeRequestTab === 'sent' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Sent ({sentRequests.length})
                            </button>
                        </div>
                        
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
                            {activeRequestTab === 'received' ? (
                                friendRequests.length === 0 ? (
                                    <div className="py-8 text-center text-zinc-600 text-sm">No pending requests</div>
                                ) : (
                                    friendRequests.map(req => {
                                        const match = getTasteMatch(req.sender?._id);
                                        return (
                                            <div key={req._id} className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                                                <Avatar user={req.sender} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{req.sender?.username}</p>
                                                    <p className="text-zinc-500 text-xs truncate">{match}% Taste Match</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleAcceptRequest(req.sender?._id, req._id)} className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors">
                                                        <Check size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeclineRequest(req._id)} className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            ) : (
                                sentRequests.length === 0 ? (
                                    <div className="py-8 text-center text-zinc-600 text-sm">No sent requests</div>
                                ) : (
                                    sentRequests.map(req => {
                                        const match = getTasteMatch(req.recipient?._id);
                                        return (
                                            <div key={req._id} className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                                                <Avatar user={req.recipient} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{req.recipient?.username}</p>
                                                    <p className="text-zinc-500 text-xs truncate">{match}% Taste Match</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleCancelRequest(req.recipient?._id, req._id)} className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Cancel Request">
                                                        <UserMinus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            )}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 lg:col-span-2 flex flex-col hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="text-blue-500 w-4 h-4" />
                            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recommendations</h2>
                        </div>
                        
                        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
                            {recommendations.length === 0 ? (
                                <div className="w-full py-16 flex flex-col items-center justify-center text-zinc-600">
                                    <Film size={24} className="mb-2 opacity-50"/>
                                    <p className="text-sm">No recommendations yet.</p>
                                </div>
                            ) : (
                                recommendations.map(rec => (
                                    <div key={rec._id} className="w-[140px] md:w-[160px] flex-none group relative">
                                        <button 
                                            onClick={(e) => handleDeleteRecommendation(rec._id, e)}
                                            className="absolute top-2 right-2 z-20 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                                        >
                                            <Trash2 size={12} />
                                        </button>

                                        <div 
                                            onClick={() => navigate(rec.anime ? `/anime/${rec.anime.mal_id}` : `/movie/${rec.movie?.tmdbId}`)}
                                            className="relative w-full h-[190px] rounded-2xl overflow-hidden mb-3 border border-white/5 group-hover:border-white/20 transition-all cursor-pointer shadow-lg"
                                        >
                                            {(rec.anime?.poster_url || rec.movie?.poster) ? (
                                                <img src={rec.anime?.poster_url || rec.movie?.poster} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Film className="text-zinc-600"/></div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-3">
                                                <p className="text-white font-bold text-xs truncate w-full shadow-black drop-shadow-md">
                                                    {rec.anime?.title || rec.movie?.title}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-2">
                                            <Avatar user={rec.from} size="sm" className="w-5 h-5 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-zinc-400 truncate">From <span className="font-semibold text-white">{rec.from?.username}</span></p>
                                                {rec.message && (
                                                    <p className="text-xs text-zinc-500 italic line-clamp-2 mt-1">"{rec.message}"</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* My Friends Grid */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Users className="text-purple-500 w-4 h-4" />
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">My Friends</h2>
                        <span className="text-zinc-500 text-sm ml-2">({friends.length})</span>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-10 text-zinc-500">Loading friends...</div>
                    ) : friends.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 bg-white/[0.02] rounded-3xl border border-white/5">
                            You haven't added any friends yet. Use the search bar above to find people!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {friends.map(friend => {
                                const match = getTasteMatch(friend._id);
                                const lastActive = getLastActive(friend._id);
                                const rw = friend.recentWatched;
                                
                                // Status colors based on taste match
                                let barColor = "from-green-500 to-emerald-400";
                                let textColor = "text-green-500";
                                if (match < 60) { barColor = "from-red-500 to-rose-400"; textColor = "text-red-500"; }
                                else if (match < 80) { barColor = "from-yellow-500 to-yellow-300"; textColor = "text-yellow-500"; }
                                
                                return (
                                    <div key={friend._id} className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-5 flex flex-col gap-4 hover:border-white/10 transition-colors shadow-lg">
                                        
                                        {/* Friend Header */}
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar user={friend} size="lg" className="border-2 border-[#1a1a1a]" />
                                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${lastActive === 'Just now' ? 'bg-green-500' : 'bg-zinc-500'} border-2 border-[#1a1a1a] rounded-full`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-bold text-base truncate">{friend.username}</h3>
                                                <p className="text-zinc-400 text-xs truncate">Active {lastActive}</p>
                                            </div>
                                            <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                        
                                        {/* Recently Watched Snippet */}
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                                            {rw ? (
                                                <>
                                                    {rw.poster ? (
                                                        <img src={rw.poster} className="w-10 h-14 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-14 rounded-lg bg-zinc-800 flex items-center justify-center"><Film size={16} className="text-zinc-600"/></div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`${rw.status === 'Watching' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'} text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide mb-1 inline-block`}>
                                                            {rw.status}
                                                        </span>
                                                        <p className="text-sm text-white font-semibold truncate">{rw.title}</p>
                                                        {rw.progress > 0 && <p className="text-xs text-zinc-500">Ep {rw.progress}</p>}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-10 h-14 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5">
                                                        <VideoOff size={16} className="text-zinc-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide mb-1 inline-block">Idle</span>
                                                        <p className="text-sm text-zinc-400 italic truncate">Not watching anything</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        
                                        {/* Taste Match */}
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <p className="text-xs text-zinc-400 font-medium">Taste Match</p>
                                                <p className={`text-sm ${textColor} font-bold`}>{match}%</p>
                                            </div>
                                            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                <div className={`bg-gradient-to-r ${barColor} h-1.5 rounded-full`} style={{ width: `${match}%` }}></div>
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex gap-3 mt-2">
                                            <button 
                                                onClick={() => handleFriendClick(friend)}
                                                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                                            >
                                                View Profile
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </main>

            {/* --- FROZEN GLASS MODAL (EXISTING) --- */}
            {selectedFriend && friendDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal}>
                    <div className="relative w-full max-w-5xl h-[85vh] md:h-[600px] flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-[32px] border border-white/10 bg-[#111] backdrop-blur-3xl" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-5 right-5 z-50 p-2.5 bg-white/5 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-md rounded-full border border-white/10 transition-all duration-300 group">
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        {loadingDetails ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {/* Profile Sidebar */}
                                <div className="w-full md:w-[35%] relative flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
                                    <div className="relative z-10 flex flex-col items-center text-center w-full">
                                        <div className="p-1 rounded-full border border-white/10 shadow-xl mb-4 bg-black/50">
                                            <Avatar user={friendDetails} size="xl" className="w-32 h-32" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{friendDetails.username}</h2>
                                        
                                        <div className="grid grid-cols-3 gap-3 w-full mt-8">
                                            {[
                                                { label: 'Anime', value: friendDetails.watchlist?.length || 0 },
                                                { label: 'Friends', value: friendDetails.friends?.length || 0 },
                                                { label: 'History', value: friendDetails.watchhistory?.length || 0 }
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                                                    <p className="text-xl font-bold text-white">{stat.value}</p>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{stat.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Recently Watched List */}
                                <div className="w-full md:w-[65%] px-8 pb-6 pt-20 flex flex-col h-full overflow-hidden bg-black/20">
                                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recently Watched</h3>
                                        {friendDetails.watchhistory && friendDetails.watchhistory.length > 0 && (
                                            <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors" onClick={() => navigate(`/friends/${friendDetails.username}/watched`)}>See All</button>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
                                        {friendDetails.watchhistory && friendDetails.watchhistory.length > 0 ? (
                                            friendDetails.watchhistory.slice().reverse().map((item, idx) => (
                                                <div key={idx} className="group flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-default shrink-0">
                                                    {item.poster ? <img src={item.poster} className="w-10 h-14 object-cover rounded-lg" /> : <div className="w-10 h-14 bg-zinc-800 rounded-lg"></div>}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <p className="font-bold text-white text-sm truncate">{item.title}</p>
                                                        <p className="text-xs text-zinc-500 mt-0.5 font-medium">{item.status}</p>
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
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Friends;