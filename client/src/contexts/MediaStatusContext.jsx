import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const MediaStatusContext = createContext(null);

const getStatusMaps = (user) => {
    const anime = {};
    const watchlist = {};

    (user?.watchhistory || []).forEach((item) => {
        anime[item.animeId] = item.status;
    });
    (user?.watchlist || []).forEach((item) => {
        watchlist[item.animeId] = true;
    });

    return { anime, watchlist };
};

export const MediaStatusProvider = ({ children }) => {
    const [animeStatuses, setAnimeStatuses] = useState({});
    const [animeWatchlist, setAnimeWatchlist] = useState({});

    const refreshStatuses = useCallback(async () => {
        const username = localStorage.getItem('username');
        if (!username || !localStorage.getItem('token')) return;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${API_URL}/users/${encodeURIComponent(username)}`);
            const maps = getStatusMaps(response.data);
            setAnimeStatuses(maps.anime);
            setAnimeWatchlist(maps.watchlist);
        } catch (error) {
            console.error('Failed to load saved anime statuses:', error);
        }
    }, []);

    useEffect(() => {
        refreshStatuses();
    }, [refreshStatuses]);

    const setAnimeStatus = useCallback((animeId, status) => {
        setAnimeStatuses((current) => ({ ...current, [animeId]: status }));
        setAnimeWatchlist((current) => {
            const next = { ...current };
            delete next[animeId];
            return next;
        });
    }, []);

    const setAnimeInWatchlist = useCallback((animeId) => {
        setAnimeWatchlist((current) => ({ ...current, [animeId]: true }));
        setAnimeStatuses((current) => {
          if (!current[animeId]) return current;
          const next = { ...current };
          delete next[animeId];
          return next;
        });
    }, []);

    const value = useMemo(() => ({
        animeStatuses,
        animeWatchlist,
        refreshStatuses,
        setAnimeStatus,
        setAnimeInWatchlist
    }), [animeStatuses, animeWatchlist, refreshStatuses, setAnimeStatus, setAnimeInWatchlist]);

    return <MediaStatusContext.Provider value={value}>{children}</MediaStatusContext.Provider>;
};

export const useMediaStatus = () => {
    const context = useContext(MediaStatusContext);
    if (!context) throw new Error('useMediaStatus must be used within MediaStatusProvider');
    return context;
};
