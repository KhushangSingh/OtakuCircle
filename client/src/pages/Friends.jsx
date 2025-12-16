import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../components/NotificationProvider';
import axios from 'axios';
import { UserPlus, Search, X, User, MessageSquare, Check, XCircle, Film, Trash2 } from 'lucide-react';

const Friends = () => {
    const { showNotification } = useNotification();
    const [friends, setFriends] = useState([]);
    const [searchUsers, setSearchUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    
    // Modal State
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendDetails, setFriendDetails] = useState(null);
    const navigate = useNavigate();
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Get Friends
                const friendsRes = await axios.get(`${API_URL}/friends`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFriends(friendsRes.data || []);

                // 2. Get Requests
                try {
                    const requestsRes = await axios.get(`${API_URL}/friends/requests`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setFriendRequests(requestsRes.data || []);
                } catch (error) { setFriendRequests([]); }

                // 3. Get Recommendations
                try {
                    const recsRes = await axios.get(`${API_URL}/recommendations/friends`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setRecommendations(recsRes.data || []);
                } catch (error) { setRecommendations([]); }

            } catch (error) {
                setFriends([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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
            await axios.post(`${API_URL}/friends/request`, { friendId }, { headers: { Authorization: `Bearer ${token}` } });
            showNotification('Request sent!', 'success');
            setSearchUsers(prev => prev.filter(u => u._id !== friendId));
        } catch (error) {
            showNotification('Error sending request', 'error');
        }
    };

    // --- DELETE RECOMMENDATION HANDLER ---
    const handleDeleteRecommendation = async (recId, e) => {
        e.stopPropagation(); // Prevent navigating to anime details when clicking delete
        
        // Optimistic update: Remove from UI immediately
        setRecommendations(prev => prev.filter(rec => rec._id !== recId));

        try {
            await axios.delete(`${API_URL}/recommendations/${recId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showNotification('Recommendation removed', 'success');
        } catch (error) {
            console.error(error);
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

    // --- AVATAR COMPONENT ---
    const Avatar = ({ user, size = 'md', className = '' }) => {
        const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-24 h-24 text-3xl' };
        
        if (user?.profilePicture) {
            return (
                <img 
                    src={user.profilePicture} 
                    alt={user.username} 
                    className={`${sizes[size]} rounded-full object-cover border border-white/10 shadow-lg bg-zinc-800 ${className}`} 
                />
            );
        }

        return (
            <div className={`${sizes[size]} bg-gradient-to-t from-zinc-800 to-zinc-700 rounded-full flex items-center justify-center text-white font-bold border border-white/10 shadow-lg ${className}`}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20 p-6 lg:p-10 pt-24 lg:pt-28">
            <div className="container mx-auto max-w-[1600px]">
                
                {/* PAGE HEADER */}
                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight">Social Hub</h1>
                    <p className="text-zinc-500 mt-1">Connect, Share, and Discover.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
                    
                    {/* --- LEFT COLUMN: SEARCH (3 Cols) --- */}
                    <div className="lg:col-span-3 sticky top-24"> 
                        <div className="relative group z-30">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="block w-full pl-11 pr-4 py-4 bg-[#1a1a1a] border border-white/10 rounded-2xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-[#202020] transition-all shadow-xl"
                                placeholder="Find people..."
                            />
                        </div>

                        {/* Search Results Area */}
                        <div className="mt-6 space-y-2">
                            {searchLoading && <p className="text-zinc-600 text-sm pl-2">Searching...</p>}
                            
                            {searchUsers.length > 0 && (
                                <div className="space-y-3 animate-fade-in">
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest pl-2">Results</p>
                                    {searchUsers.map(user => (
                                        <div key={user._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar user={user} size="sm" />
                                                <span className="text-sm font-medium text-white">{user.username}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleAddFriend(user._id)}
                                                className="bg-white/10 hover:bg-white text-white hover:text-black p-2 rounded-lg transition-all"
                                            >
                                                <UserPlus size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!searchLoading && search.trim() && searchUsers.length === 0 && (
                                <p className="text-zinc-600 text-sm pl-2">No users found.</p>
                            )}
                        </div>
                    </div>

                    {/* --- CENTER COLUMN: RECOMMENDATIONS (5 Cols) --- */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <MessageSquare size={20} className="text-blue-500" /> Recommendations
                            </h2>
                        </div>

                        {recommendations.length > 0 ? (
                            <div className="space-y-4">
                                {recommendations.map((rec) => (
                                    <div key={rec._id} className="group relative bg-[#151515] border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all duration-300 hover:bg-[#1a1a1a] flex gap-5 items-start shadow-lg">
                                        
                                        {/* Poster Image */}
                                        <div className="w-20 h-28 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden shadow-md cursor-pointer hover:opacity-80 transition" onClick={() => navigate(`/anime/${rec.anime?.mal_id}`)}>
                                            {rec.anime?.poster_url ? (
                                                <img src={rec.anime.poster_url} className="w-full h-full object-cover" alt={rec.anime.title} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600"><Film size={20}/></div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg text-white truncate cursor-pointer hover:text-blue-400 max-w-[70%]" onClick={() => navigate(`/anime/${rec.anime?.mal_id}`)}>
                                                    {rec.anime?.title || "Unknown Anime"}
                                                </h3>
                                                
                                                {/* --- Actions Area (Badge + Delete) --- */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">NEW</span>
                                                    <button 
                                                        onClick={(e) => handleDeleteRecommendation(rec._id, e)}
                                                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete Recommendation"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
                                                From <span className="text-white font-medium flex items-center gap-1">
                                                    <Avatar user={rec.from} size="sm" className="w-4 h-4 text-[8px]" /> {rec.from?.username}
                                                </span>
                                            </p>
                                            
                                            {rec.message && (
                                                <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5 text-sm text-zinc-300 italic">
                                                    "{rec.message}"
                                                </div>
                                            )}
                                            
                                            <div className="mt-3 flex gap-2">
                                                <button 
                                                    onClick={() => navigate(`/anime/${rec.anime?.mal_id}`)}
                                                    className="flex-1 bg-white text-black py-2 rounded-lg text-xs font-bold hover:bg-zinc-200 transition"
                                                >
                                                    View Anime
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center bg-[#151515] border border-white/5 border-dashed rounded-2xl text-zinc-500">
                                <MessageSquare size={32} className="mb-2 opacity-50" />
                                <p>No recommendations yet.</p>
                            </div>
                        )}
                    </div>

                    {/* --- RIGHT COLUMN: FRIENDS LIST (4 Cols) --- */}
                    <div className="lg:col-span-4 space-y-8">
                        
                        {/* 1. Friend Requests */}
                        {friendRequests.length > 0 && (
                            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-5">
                                <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-4 flex justify-between">
                                    Requests <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{friendRequests.length}</span>
                                </h3>
                                <div className="space-y-3">
                                    {friendRequests.map((req) => (
                                        <div key={req._id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Avatar user={req.sender} size="md" />
                                                <span className="font-semibold text-sm">{req.sender?.username}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="text-green-400 hover:bg-green-400/20 p-1.5 rounded transition"><Check size={16} /></button>
                                                <button className="text-red-400 hover:bg-red-400/20 p-1.5 rounded transition"><XCircle size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. My Friends */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                                <User size={20} className="text-purple-500" /> My Friends
                            </h2>
                            
                            {loading ? (
                                <div className="text-zinc-500 text-sm">Loading friends...</div>
                            ) : friends.length === 0 ? (
                                <div className="p-6 bg-[#151515] rounded-2xl border border-white/5 text-center text-zinc-500">
                                    No friends added.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {friends.map(friend => (
                                        <div 
                                            key={friend._id}
                                            onClick={() => handleFriendClick(friend)}
                                            className="group flex items-center gap-4 p-4 bg-[#151515] border border-white/5 hover:border-white/20 rounded-xl cursor-pointer hover:bg-[#1a1a1a] transition-all"
                                        >
                                            <Avatar user={friend} size="lg" className="group-hover:scale-105 transition-transform" />
                                            
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-white text-base truncate">{friend.username}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-zinc-500 font-medium bg-white/5 px-2 py-0.5 rounded">
                                                        {friend.watchlistCount || 0} Watched
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="text-zinc-600 group-hover:text-white transition-colors">
                                                <User size={16} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* --- FROZEN GLASS MODAL (FINAL) --- */}
            {selectedFriend && friendDetails && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={closeModal}
                >
                    <div 
                        className="relative w-full max-w-5xl h-[600px] flex flex-col md:flex-row overflow-hidden shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] rounded-[32px] border border-white/10 ring-1 ring-white/5 bg-zinc-900/60 backdrop-blur-3xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button 
                            onClick={closeModal} 
                            className="absolute top-5 right-5 z-50 p-2.5 bg-black/20 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-md rounded-full border border-white/10 transition-all duration-300 group"
                        >
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        {loadingDetails ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {/* Friend Profile Details */}
                                <div className="w-full md:w-[35%] relative flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                                    <div className="relative z-10 flex flex-col items-center text-center w-full">
                                        <div className="p-1 rounded-full border border-white/10 shadow-2xl mb-4">
                                            <Avatar user={friendDetails} size="xl" className="w-32 h-32" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
                                            {friendDetails.username}
                                        </h2>
                                        <div className="grid grid-cols-3 gap-3 w-full mt-8">
                                            {[
                                                { label: 'Anime', value: friendDetails.watchlist?.length || 0 },
                                                { label: 'Friends', value: friendDetails.friends?.length || 0 },
                                                { label: 'History', value: friendDetails.watchhistory?.length || 0 }
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl text-center backdrop-blur-sm">
                                                    <p className="text-xl font-bold text-white">{stat.value}</p>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">{stat.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Friend Recently Watched */}
                                <div className="w-full md:w-[65%] px-8 pb-6 pt-20 flex flex-col h-full overflow-hidden relative">
                                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                                        <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Recently Watched</h3>
                                        {friendDetails.watchhistory && friendDetails.watchhistory.length > 0 && (
                                            <button
                                                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                                onClick={() => navigate(`/friends/${friendDetails.username}/watched`)}
                                            >
                                                See All
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                                        {friendDetails.watchhistory && friendDetails.watchhistory.length > 0 ? (
                                            friendDetails.watchhistory.slice().reverse().slice(0, 5).map((item, idx) => (
                                                <div key={idx} className="group flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-default shrink-0">
                                                    {item.poster ? <img src={item.poster} className="w-10 h-14 object-cover rounded-lg" /> : <div className="w-10 h-14 bg-zinc-800 rounded-lg"></div>}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <p className="font-bold text-white text-sm truncate">{item.title}</p>
                                                        <p className="text-xs text-white/40 mt-0.5 font-medium">{item.status}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                                                <p className="text-white/30 text-sm">No recent activity.</p>
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