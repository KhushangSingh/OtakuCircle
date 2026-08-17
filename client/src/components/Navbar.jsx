import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Bell, Menu, Sparkles, Home, Heart, Users, Film } from 'lucide-react'; 
import axios from 'axios';

const Navbar = () => {
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Scroll State
  const [isScrolled, setIsScrolled] = useState(false);
  
  // User Avatar State
  const [userProfilePic, setUserProfilePic] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  
  // API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // --- STYLES ---
  const searchInputClass = "flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-3 transition-all duration-300 focus-within:bg-black/60 focus-within:border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]";
  const glassStyle = "bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 text-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5";

  // 1. SCROLL TRIGGER LOGIC
  useEffect(() => {
    const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Fetch Data Logic (Notifications & User Profile)
  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');

        if (token) {
            try {
                // Fetch notifications
                const res = await axios.get(`${API_URL}/social/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Only show unread notifications in the dropdown
                const unread = res.data.filter(n => !n.isRead);
                setNotifications(unread || []);
            } catch (error) { 
                console.error("Error fetching notifications"); 
            }

            try {
                // Fetch User Profile Pic
                if (username && !userProfilePic) {
                    const userRes = await axios.get(`${API_URL}/users/${username}`);
                    if (userRes.data?.profilePicture) {
                        setUserProfilePic(userRes.data.profilePicture);
                    }
                }
            } catch (error) { 
                console.error("Error fetching user profile"); 
            }
        }
    };
    
    fetchData();
    // Poll every 30 seconds to keep updated without overwhelming server
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [API_URL, userProfilePic]);

  // 3. Search Logic (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
        const query = searchQuery.trim();
        if (query.length > 1) {
            try {
                const res = await axios.get(`${API_URL}/anime/search?q=${encodeURIComponent(query)}`);
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

  const isLoggedIn = !!localStorage.getItem('token');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
        if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMobileMenuOpen]);

  const handleResultClick = (id) => {
      setIsSearchOpen(false);
      setSearchQuery('');
      navigate(`/anime/${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim().length > 0) {
        setIsSearchOpen(false);
        navigate(`/smart-search?q=${encodeURIComponent(searchQuery)}`);
        setSearchQuery('');
    }
  };

  // --- NOTIFICATION HANDLER ---
  const handleViewNotification = async (notification, e) => {
    e.stopPropagation();
    
    // Optimistic Update
    setNotifications(prev => prev.filter(n => n._id !== notification._id));

    try {
        const token = localStorage.getItem('token');
        
        await axios.put(`${API_URL}/social/notifications/${notification._id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (notification.animeId) {
            navigate(`/anime/${notification.animeId}`);
            setIsNotificationsOpen(false); 
        } else if (notification.type === 'FRIEND_REQUEST') {
            navigate('/friends');
            setIsNotificationsOpen(false);
        }
    } catch (error) {
        console.error("Failed to mark notification as read", error);
    }
  };

  // --- LOGO CLICK HANDLER ---
  const handleLogoClick = (e) => {
      e.preventDefault();
      // Clear any saved scroll position so Home renders at the top
      sessionStorage.removeItem('otaku_home_scroll');
      sessionStorage.removeItem('otaku_movies_home_scroll');
      window.scrollTo(0, 0);
      setIsMobileMenuOpen(false);
      navigate('/');
  };

  const unreadCount = notifications.length;

  const getLinkClass = (path) => {
    const baseClasses = "hidden md:flex items-center gap-2 text-lg font-bold transition-all duration-200 px-4 py-2 rounded-lg relative z-20";
    const activeClasses = "bg-white/10 text-white shadow-sm border border-white/5";
    const inactiveClasses = "text-zinc-400 hover:text-white hover:bg-white/5";
    return `${baseClasses} ${location.pathname === path ? activeClasses : inactiveClasses}`;
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 h-20">
      
      {/* Background Layers */}
      <div className={`absolute inset-0 bg-[#050505]/80 backdrop-blur-xl shadow-2xl transition-opacity duration-500 ease-in-out ${isScrolled ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-500 ease-in-out ${isScrolled ? 'opacity-0' : 'opacity-100'}`}></div>

      <div className="w-full px-8 lg:px-12 h-full flex justify-between items-center relative z-10">
        
        {/* Logo */}
        <a href="/" onClick={handleLogoClick} className="text-2xl md:text-3xl font-extrabold tracking-tighter flex items-center group cursor-pointer">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 group-hover:to-white transition-colors pr-2">
                OtakuCircle
            </span>
        </a>
        
        {/* Search Bar */}
        <div className="relative hidden md:block w-1/4 group" ref={searchRef}>
            <div className={searchInputClass}>
                <Search className="text-zinc-500 w-5 h-5 mr-3 group-focus-within:text-white transition-colors" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown} 
                    placeholder="Search anime..." 
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-zinc-500 group-focus-within:placeholder-zinc-400"
                />
            </div>
            
            {/* Search Dropdown */}
            {isSearchOpen && (
                <div className={`absolute top-full mt-3 w-full ${glassStyle}`}>
                    <div className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-widest bg-white/5 border-b border-white/5">
                        Top Matches
                    </div>
                    {searchResults.length > 0 ? searchResults.map(anime => (
                        <div key={anime._id} onClick={() => handleResultClick(anime.mal_id)} className="flex items-center gap-4 p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-none transition-colors group/item">
                            <img src={anime.poster_url} alt={anime.title} className="w-9 h-12 object-cover rounded shadow-md bg-zinc-800" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white truncate group-hover/item:text-blue-400 transition-colors">{anime.title}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">{anime.type || 'TV'} • {anime.score || 'N/A'}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-4 text-center text-xs text-zinc-500">No direct title matches found.</div>
                    )}
                    
                    <div 
                        onClick={() => {
                            navigate(`/smart-search?q=${encodeURIComponent(searchQuery)}`);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                        }}
                        className="p-3 bg-white/5 border-b border-white/5 hover:bg-white/20 cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-zinc-200 transition-all border-t tracking-wide"
                    >
                        <Sparkles size={12} />
                        ASK AI ABOUT "{searchQuery}"
                    </div>
                </div>
            )}
        </div>

        {/* Links & Profile */}
        <div className="flex items-center gap-4">
            {isLoggedIn && (
                <div className="hidden md:flex items-center gap-2 mr-4">
                    <Link to="/" className={getLinkClass('/')}>
                        <Home size={16} /> Home
                    </Link>
                    <Link to="/smart-search" className={getLinkClass('/smart-search')}>
                        <Sparkles size={16} className={location.pathname === '/smart-search' ? "text-blue-400" : ""} /> Smart Search
                    </Link>
                    <Link to="/recommendations" className={getLinkClass('/recommendations')}>
                        <Heart size={16} /> For You
                    </Link>
                    <Link to="/friends" className={getLinkClass('/friends')}>
                        <Users size={16} /> Friends
                    </Link>
                    {import.meta.env.VITE_ENABLE_MOVIES === 'true' && (
                        <Link to="/movies" className={getLinkClass('/movies')}>
                            <Film size={16} /> Movies & Shows
                        </Link>
                    )}
                </div>
            )}

            {isLoggedIn && (
                <>
                    {/* Notifications */}
                    <div className="relative" ref={notificationsRef}>
                        <button 
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`relative p-2 rounded-full hover:bg-white/10 transition-colors ${isNotificationsOpen ? 'bg-white/10 text-white' : 'text-zinc-400'}`}
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 border-2 border-[#0d0d0d] rounded-full"></span>
                            )}
                        </button>
                        
                        {/* Notifications Dropdown */}
                        {isNotificationsOpen && (
                            <div className={`absolute right-0 top-full mt-3 w-96 md:w-[400px] ${glassStyle}`}>
                                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                                    <h3 className="font-semibold text-base text-white">Notifications</h3>
                                    {unreadCount > 0 && <span className="text-sm text-blue-400 font-bold">{unreadCount} NEW</span>}
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-3 space-y-2">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-zinc-500 text-sm">No new notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n._id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center gap-4 hover:bg-white/10 transition-colors group">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{n.message}</p>
                                                    <p className="text-xs text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => handleViewNotification(n, e)}
                                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded transition-all shrink-0 uppercase tracking-wider"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Link */}
                    <Link to={`/profile/${localStorage.getItem('username')}`} className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 hover:from-blue-600 hover:to-purple-600 flex items-center justify-center text-white transition-all shadow-lg border border-white/10 overflow-hidden relative z-20">
                        {userProfilePic ? (
                            <img src={userProfilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4" />
                        )}
                    </Link>
                </>
            )}

            {!isLoggedIn && (
               <Link to="/login" className="px-6 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-gray-200 transition-colors relative z-20">
                   Sign In
               </Link>
            )}
            
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-zinc-400 relative z-20 hover:text-white transition-colors"
            >
                <Menu size={24} />
            </button>
        </div>
      </div>

      {/* --- MOBILE MENU OVERLAY --- */}
      <div className={`fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl transition-all duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {/* Close button */}
          <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 p-2 text-white hover:text-zinc-300 transition-colors"
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div className="flex flex-col items-center justify-center h-full gap-8">
              {!isLoggedIn && (
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-3xl font-bold text-white mb-8 hover:text-zinc-300 transition-colors">
                      Sign In
                  </Link>
              )}
              {isLoggedIn && (
                  <>
                      <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-3xl font-bold transition-colors ${location.pathname === '/' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <Home size={32} /> Home
                      </Link>
                      <Link to="/smart-search" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-3xl font-bold transition-colors ${location.pathname === '/smart-search' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <Sparkles size={32} /> Smart Search
                      </Link>
                      <Link to="/recommendations" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-3xl font-bold transition-colors ${location.pathname === '/recommendations' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <Heart size={32} /> For You
                      </Link>
                      <Link to="/friends" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-3xl font-bold transition-colors ${location.pathname === '/friends' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <Users size={32} /> Friends
                      </Link>
                      {import.meta.env.VITE_ENABLE_MOVIES === 'true' && (
                          <Link to="/movies" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-3xl font-bold transition-colors ${location.pathname === '/movies' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                              <Film size={32} /> Movies & Shows
                          </Link>
                      )}
                  </>
              )}
          </div>
      </div>
    </nav>
  );
};

export default Navbar;