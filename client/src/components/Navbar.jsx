import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Bell, Menu, Sparkles, Check, X, UserPlus } from './icons';
import SearchBar from './SearchBar';
import axios from 'axios';
import { getValidToken, clearAuth } from '../utils/auth';
import { useMediaStatus } from '../contexts/MediaStatusContext';

const Navbar = () => {
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState('all');
  
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
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Global Media Type (Anime / Manga) from Context
  const { mediaTab, setMediaTab } = useMediaStatus();

  const handleMediaTabChange = (type) => {
    if (type === mediaTab) return;
    setMediaTab(type);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };
  
  // API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // --- STYLES ---
  // Liquid Glassmorphic styling based on Glasio reference spec
  const glassStyle = "bg-[#0d0d0d]/85 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 text-gray-200 rounded-[1.75rem] shadow-2xl shadow-black/40 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200";

  // 1. SCROLL TRIGGER LOGIC
  useEffect(() => {
    const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getValidToken());

  // 2. Fetch Data Logic (Notifications & User Profile)
  const fetchData = useCallback(async () => {
      const token = getValidToken();
      const username = localStorage.getItem('username');

      if (!token) {
          setIsLoggedIn(false);
          setNotifications([]);
          setUserProfilePic(null);
          return;
      }

      setIsLoggedIn(true);

      try {
          // Fetch notifications
          const res = await axios.get(`${API_URL}/social/notifications`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (error) { 
          if (error.response?.status === 401) {
              clearAuth();
              setIsLoggedIn(false);
              setNotifications([]);
              setUserProfilePic(null);
              return;
          }
      }

      try {
          // Fetch User Profile Pic
          if (username && !userProfilePic) {
              const userRes = await axios.get(`${API_URL}/users/${encodeURIComponent(username)}`);
              if (userRes.data?.profilePicture) {
                  setUserProfilePic(userRes.data.profilePicture);
              }
          }
      } catch (error) { 
          // Silently ignore optional profile picture lookup errors
      }
  }, [API_URL, userProfilePic]);

  useEffect(() => {
    fetchData();

    // Only poll when actively authenticated
    const interval = setInterval(() => {
        if (getValidToken()) {
            fetchData();
        }
    }, 30000);

    const handleAuthEvent = () => {
        const valid = !!getValidToken();
        setIsLoggedIn(valid);
        if (!valid) {
            setNotifications([]);
            setUserProfilePic(null);
        } else {
            fetchData();
        }
    };

    window.addEventListener('auth-change', handleAuthEvent);
    window.addEventListener('storage', handleAuthEvent);

    return () => {
        clearInterval(interval);
        window.removeEventListener('auth-change', handleAuthEvent);
        window.removeEventListener('storage', handleAuthEvent);
    };
  }, [fetchData]);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (searchRef.current && !searchRef.current.contains(event.target)) setIsSearchOpen(false);
        if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setIsNotificationsOpen(false);
        if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) setIsProfileDropdownOpen(false);
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

  const handleResultClick = (anime) => {
      setIsSearchOpen(false);
      setSearchQuery('');
      const malId = typeof anime === 'object' ? (anime.mal_id || anime._id) : anime;
      const mediaType = typeof anime === 'object' ? (anime.mediaType || 'anime') : 'anime';
      const title = typeof anime === 'object' ? anime.title : '';
      const params = new URLSearchParams();
      if (mediaType) params.set('mediaType', mediaType);
      if (title) params.set('title', title);
      const query = params.toString();
      navigate(`/anime/${malId}${query ? `?${query}` : ''}`, {
          state: { mediaType, title }
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim().length > 0) {
        setIsSearchOpen(false);
        navigate(`/smart-search?q=${encodeURIComponent(searchQuery)}`);
        setSearchQuery('');
    }
  };

  // Helper: Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // --- NOTIFICATION HANDLERS ---
  const handleMarkAllAsRead = async (e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/social/notifications/read-all`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        console.error("Failed to mark all as read", error);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.filter(n => n._id !== notificationId));

    try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/social/notifications/${notificationId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        console.error("Failed to delete notification", error);
    }
  };

  // --- NOTIFICATION HANDLER ---
  const handleViewNotification = async (notification, e) => {
    e.stopPropagation();
    
    // Optimistic Update
    setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));

    try {
        const token = localStorage.getItem('token');
        
        await axios.put(`${API_URL}/social/notifications/${notification._id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (notification.type === 'RECOMMENDATION') {
            navigate('/friends?tab=recommendations');
            setIsNotificationsOpen(false);
        } else if (notification.type === 'FRIEND_REQUEST') {
            navigate('/friends?tab=requests');
            setIsNotificationsOpen(false);
        } else if (notification.animeId) {
            const mediaType = notification.mediaType || 'anime';
            navigate(`/anime/${notification.animeId}?mediaType=${mediaType}`);
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

  const handleLogout = () => {
      clearAuth();
      setIsLoggedIn(false);
      setNotifications([]);
      setUserProfilePic(null);
      setIsProfileDropdownOpen(false);
      setIsMobileMenuOpen(false);
      navigate('/');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getLinkClass = (path, showOnTablet = false) => {
    const displayClass = showOnTablet ? "hidden md:flex" : "hidden xl:flex";
    const baseClasses = `${displayClass} items-center gap-1.5 md:gap-2 text-[13px] md:text-sm xl:text-base font-bold whitespace-nowrap transition-all duration-300 px-1.5 md:px-2 xl:px-3 py-2 relative z-20 group`;
    const activeClasses = "text-white after:content-[''] after:absolute after:bottom-0 after:left-1/4 after:w-1/2 after:h-[2px] after:bg-white after:rounded-full";
    const inactiveClasses = "text-zinc-200 hover:text-white after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[2px] after:bg-white/50 after:transition-all after:duration-300 hover:after:w-1/2";
    return `${baseClasses} ${location.pathname === path ? activeClasses : inactiveClasses}`;
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] h-20">
      
      {/* Background Layers */}
      <div className={`absolute inset-0 bg-[#050505]/80 backdrop-blur-xl shadow-2xl transition-opacity duration-500 ease-in-out ${isScrolled ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-500 ease-in-out ${isScrolled ? 'opacity-0' : 'opacity-100'}`}></div>

      <div className="w-full px-4 md:px-6 xl:px-12 h-full flex justify-between items-center relative z-10 gap-2 sm:gap-4">
        
        {/* Left Section: Logo & Media Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 shrink-0">
            {/* Brand Title (Logo removed, no text clipping) */}
            <a href="/" onClick={handleLogoClick} className="text-xl md:text-2xl xl:text-3xl font-extrabold tracking-tight flex items-center group cursor-pointer select-none">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-100 to-zinc-300 group-hover:to-white transition-colors inline-block pr-2 py-0.5 whitespace-nowrap">
                    OtakuCircle
                </span>
            </a>

            {/* Anime / Manga Liquid Glass Switcher */}
            <div className="inline-flex p-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-md">
                <button
                    type="button"
                    onClick={() => handleMediaTabChange('anime')}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        mediaTab === 'anime'
                            ? 'bg-white text-black shadow-md'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Anime
                </button>
                <button
                    type="button"
                    onClick={() => handleMediaTabChange('manga')}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        mediaTab === 'manga'
                            ? 'bg-white text-black shadow-md'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Manga
                </button>
            </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-[140px] sm:max-w-[180px] md:max-w-[250px] xl:max-w-sm group mx-2 md:mx-4" ref={searchRef}>
            <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mediaTab === 'manga' ? "Search manga..." : "Search anime..."}
            />
            
            {/* Search Dropdown */}
            {isSearchOpen && (
                <div className={`absolute top-full mt-3 w-full ${glassStyle}`}>
                    <div className="px-4 py-3 text-xs font-bold text-zinc-200 uppercase tracking-widest bg-white/5 border-b border-white/5">
                        Top Matches
                    </div>
                    {searchResults.length > 0 ? searchResults.map(anime => (
                        <div key={anime._id} onClick={() => handleResultClick(anime)} className="flex items-center gap-4 p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-none transition-colors group/item">
                            <img src={anime.poster_url} alt={anime.title} className="w-9 h-12 object-cover rounded shadow-md bg-zinc-800" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-white truncate group-hover/item:text-blue-400 transition-colors">{anime.title}</p>
                                <p className="text-[10px] text-zinc-200 mt-0.5">{anime.type || 'TV'} • {anime.score ? Number(anime.score).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-4 text-center text-xs text-zinc-300">No direct title matches found.</div>
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
        <div className="flex items-center gap-2 xl:gap-4">
            {isLoggedIn && (
                <div className="hidden md:flex items-center gap-2 mr-4">
                    <Link to="/" className={getLinkClass('/', true)}>
                        Home
                    </Link>
                    <Link to="/smart-search" className={getLinkClass('/smart-search', false)}>
                        Smart Search
                    </Link>
                    <Link to="/recommendations" className={getLinkClass('/recommendations', false)}>
                        For You
                    </Link>
                    <Link to="/friends" className={getLinkClass('/friends', false)}>
                        Friends
                    </Link>
                </div>
            )}

            {isLoggedIn && (
                <>
                    {/* Notifications */}
                    <div className="relative" ref={notificationsRef}>
                        <button 
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`relative p-2 rounded-full hover:bg-white/10 transition-colors ${isNotificationsOpen ? 'bg-white/10 text-white' : 'text-zinc-200'}`}
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 border-2 border-[#0d0d0d] rounded-full"></span>
                            )}
                        </button>
                        
                        {/* Notifications Dropdown */}
                        {isNotificationsOpen && (
                            <div className={`absolute right-0 top-full mt-3 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[440px] ${glassStyle} shadow-2xl`}>
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-white">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                                                {unreadCount} NEW
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {unreadCount > 0 && (
                                            <button 
                                                type="button"
                                                onClick={handleMarkAllAsRead}
                                                className="px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                                title="Mark all notifications as read"
                                            >
                                                <Check className="w-3.5 h-3.5 text-blue-400" />
                                                <span>Mark all read</span>
                                            </button>
                                        )}
                                        <button 
                                            type="button"
                                            onClick={() => setIsNotificationsOpen(false)}
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                            title="Close"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Filter Tabs: All vs Unread */}
                                <div className="flex border-b border-white/5 bg-black/40 px-3 py-1.5 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNotificationTab('all')}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            notificationTab === 'all'
                                                ? 'bg-white/15 text-white'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        All ({notifications.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotificationTab('unread')}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            notificationTab === 'unread'
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <span>Unread</span>
                                        {unreadCount > 0 && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                        )}
                                    </button>
                                </div>

                                {/* Notification List */}
                                <div className="max-h-[min(380px,55vh)] overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                                    {(notificationTab === 'unread' ? notifications.filter(n => !n.isRead) : notifications).length === 0 ? (
                                        <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                                            <p className="text-sm font-semibold text-zinc-200">
                                                {notificationTab === 'unread' ? "All caught up!" : "No notifications yet"}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
                                                {notificationTab === 'unread' 
                                                    ? "You have reviewed all your recent notifications." 
                                                    : "Friend requests and recommendations will appear here."}
                                            </p>
                                        </div>
                                    ) : (
                                        (notificationTab === 'unread' ? notifications.filter(n => !n.isRead) : notifications).map(n => {
                                            const isRec = n.type === 'RECOMMENDATION';
                                            const isFriendReq = n.type === 'FRIEND_REQUEST';
                                            return (
                                                <div 
                                                    key={n._id} 
                                                    onClick={(e) => handleViewNotification(n, e)}
                                                    className={`p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 group relative cursor-pointer ${
                                                        !n.isRead 
                                                            ? 'bg-blue-500/[0.08] border-blue-500/25 hover:bg-blue-500/[0.14] hover:border-blue-500/40' 
                                                            : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10'
                                                    }`}
                                                >
                                                    {/* Indicator */}
                                                    {!n.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                                                    )}

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 pr-6">
                                                        <p className={`text-xs leading-relaxed line-clamp-2 ${!n.isRead ? 'text-zinc-100 font-semibold' : 'text-zinc-300'}`}>
                                                            {n.message}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-400">
                                                            <span>{formatTimeAgo(n.createdAt)}</span>
                                                            {!n.isRead && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/15 px-1.5 py-0.2 rounded">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Dismiss Cross Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteNotification(n._id, e)}
                                                        className="absolute top-2.5 right-2.5 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                        title="Dismiss notification"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileDropdownRef}>
                        <button 
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 hover:from-blue-600 hover:to-purple-600 flex items-center justify-center text-white transition-all shadow-lg border border-white/10 overflow-hidden relative z-20 focus:outline-none"
                        >
                            {userProfilePic ? (
                                <img src={userProfilePic} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </button>
                        
                        {isProfileDropdownOpen && (
                            <div className={`absolute right-0 top-full mt-3 w-48 ${glassStyle} py-2`}>
                                <div className="px-4 py-2 border-b border-white/5 mb-1">
                                    <p className="text-sm font-bold text-white truncate">{localStorage.getItem('username')}</p>
                                </div>
                                
                                <Link 
                                    to={`/profile/${localStorage.getItem('username')}`} 
                                    onClick={() => setIsProfileDropdownOpen(false)}
                                    className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Profile
                                </Link>

                                <Link 
                                    to="/settings" 
                                    onClick={() => setIsProfileDropdownOpen(false)}
                                    className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Settings
                                </Link>

                                <div className="border-t border-white/5 my-1"></div>

                                <Link 
                                    to="/privacy" 
                                    onClick={() => setIsProfileDropdownOpen(false)}
                                    className="flex items-center px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Privacy Policy
                                </Link>

                                <Link 
                                    to="/terms" 
                                    onClick={() => setIsProfileDropdownOpen(false)}
                                    className="flex items-center px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Terms of Service
                                </Link>

                                <div className="border-t border-white/5 my-1"></div>
                                
                                <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                                >
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!isLoggedIn && (
               <Link to="/login" className="px-6 py-2 bg-white text-black font-bold rounded-full text-sm hover:bg-gray-200 transition-colors relative z-20">
                   Sign In
               </Link>
            )}
            
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="xl:hidden p-2 text-zinc-200 relative z-20 hover:text-white transition-colors"
            >
                <Menu size={24} />
            </button>
        </div>
      </div>

      {/* --- MOBILE MENU OVERLAY --- */}
      
      {/* --- OVERLAY BACKGROUND --- */}
      <div 
        className={`fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>
      {/* --- MOBILE/TABLET DRAWER --- */}
      <div className={`fixed inset-y-0 right-0 w-[65%] sm:w-[50%] md:w-[40%] max-w-sm z-[60] bg-black/95 backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-in-out xl:hidden border-l border-white/5 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Close button */}
          <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 p-2 text-white hover:text-zinc-300 transition-colors"
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div className="flex flex-col items-center justify-center h-full gap-5">
              {/* Mobile Media Switcher */}
              <div className="inline-flex p-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-md mb-2">
                  <button
                      type="button"
                      onClick={() => { handleMediaTabChange('anime'); setIsMobileMenuOpen(false); }}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          mediaTab === 'anime' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                      }`}
                  >
                      Anime
                  </button>
                  <button
                      type="button"
                      onClick={() => { handleMediaTabChange('manga'); setIsMobileMenuOpen(false); }}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          mediaTab === 'manga' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                      }`}
                  >
                      Manga
                  </button>
              </div>

              {!isLoggedIn && (
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold text-white mb-6 hover:text-zinc-300 transition-colors">
                      Sign In
                  </Link>
              )}
              {isLoggedIn && (
                  <>
                      <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`md:hidden flex items-center gap-3 text-xl font-bold transition-colors ${location.pathname === '/' ? 'text-white' : 'text-zinc-300 hover:text-zinc-300'}`}>
                          Home
                      </Link>
                      <Link to="/smart-search" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-xl font-bold transition-colors ${location.pathname === '/smart-search' ? 'text-blue-400' : 'text-zinc-300 hover:text-zinc-300'}`}>
                          Smart Search
                      </Link>
                      <Link to="/recommendations" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-xl font-bold transition-colors ${location.pathname === '/recommendations' ? 'text-white' : 'text-zinc-300 hover:text-zinc-300'}`}>
                          For You
                      </Link>
                      <Link to="/friends" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 text-xl font-bold transition-colors ${location.pathname === '/friends' ? 'text-white' : 'text-zinc-300 hover:text-zinc-300'}`}>
                          Friends
                      </Link>
                      
                      <div className="w-16 border-t border-white/10 my-1"></div>
                      <Link to="/privacy" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                          Privacy Policy
                      </Link>
                      <Link to="/terms" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                          Terms of Service
                      </Link>
                      <button 
                          onClick={handleLogout} 
                          className="flex items-center gap-3 text-xl font-bold transition-colors text-red-500 hover:text-red-400 mt-4"
                      >
                          Log Out
                      </button>
                  </>
              )}
          </div>
      </div>
    </nav>
  );
};

export default Navbar;