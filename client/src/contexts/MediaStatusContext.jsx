import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const MediaStatusContext = createContext(null);

const getStatusMaps = (user) => {
    const anime = {};
    const watchlist = {};
    const movies = {};
    const movieWatchlist = {};

    (user?.watchhistory || []).forEach((item) => {
        anime[item.animeId] = item.status;
    });
    (user?.watchlist || []).forEach((item) => {
        watchlist[item.animeId] = true;
    });
    (user?.movieWatchhistory || []).forEach((item) => {
        movies[item.tmdbId] = item.status;
    });
    (user?.movieWatchlist || []).forEach((item) => {
        movieWatchlist[item.tmdbId] = true;
    });

    return { anime, watchlist, movies, movieWatchlist };
};

export const MediaStatusProvider = ({ children }) => {
    const [animeStatuses, setAnimeStatuses] = useState({});
    const [animeWatchlist, setAnimeWatchlist] = useState({});
    const [movieStatuses, setMovieStatuses] = useState({});
    const [movieWatchlist, setMovieWatchlist] = useState({});

    const refreshStatuses = useCallback(async () => {
        const username = localStorage.getItem('username');
        if (!username || !localStorage.getItem('token')) return;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${API_URL}/users/${encodeURIComponent(username)}`);
            const maps = getStatusMaps(response.data);
            setAnimeStatuses(maps.anime);
            setAnimeWatchlist(maps.watchlist);
            setMovieStatuses(maps.movies);
            setMovieWatchlist(maps.movieWatchlist);
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

    const setMovieStatus = useCallback((tmdbId, status) => {
        setMovieStatuses((current) => ({ ...current, [tmdbId]: status }));
        setMovieWatchlist((current) => {
            const next = { ...current };
            delete next[tmdbId];
            return next;
        });
    }, []);

    const setMovieInWatchlist = useCallback((tmdbId) => {
        setMovieWatchlist((current) => ({ ...current, [tmdbId]: true }));
        setMovieStatuses((current) => {
            if (!current[tmdbId]) return current;
            const next = { ...current };
            delete next[tmdbId];
            return next;
        });
    }, []);

    const value = useMemo(() => ({
        animeStatuses,
        animeWatchlist,
        movieStatuses,
        movieWatchlist,
        refreshStatuses,
        setAnimeStatus,
        setAnimeInWatchlist,
        setMovieStatus,
        setMovieInWatchlist
    }), [animeStatuses, animeWatchlist, movieStatuses, movieWatchlist, refreshStatuses, setAnimeStatus, setAnimeInWatchlist, setMovieStatus, setMovieInWatchlist]);

    return <MediaStatusContext.Provider value={value}>{children}</MediaStatusContext.Provider>;
};

export const useMediaStatus = () => {
    const context = useContext(MediaStatusContext);
    if (!context) throw new Error('useMediaStatus must be used within MediaStatusProvider');
    return context;
};
