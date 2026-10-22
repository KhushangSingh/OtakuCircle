import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- Contexts ---
import { NotificationProvider } from './components/NotificationProvider';
import { MediaStatusProvider } from './contexts/MediaStatusContext';

// --- Components ---
import Navbar from './components/Navbar';

// --- Pages ---
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AnimeDetails from './pages/AnimeDetails';
import Recommendations from './pages/Recommendations';
import Friends from './pages/Friends';
import FriendWatchedList from './pages/FriendWatchedList';
import AnimeSectionMore from './pages/AnimeSectionMore';
import SmartSearch from './pages/SmartSearch';
import MoviesHome from './pages/MoviesHome';
import MovieDetails from './pages/MovieDetails';
import MovieSectionMore from './pages/MovieSectionMore';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import VerifyLink from './pages/VerifyLink';

// Layout Wrapper (Applied to routes with Navbar)
const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

function App() {
  // Check if token exists in localStorage to determine auth status
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    // Re-check auth status on mount
    setIsAuthenticated(!!localStorage.getItem('token'));
  }, []);

  return (
    <NotificationProvider>
      <BrowserRouter>
        <MediaStatusProvider>
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          
          <Routes>
            {/* --- Public Legal & Auth Routes --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            {/* Email link verification for password linking flow */}
            <Route path="/verify-link" element={<VerifyLink />} />

            {/* --- Routes with MainLayout --- */}
            <Route element={<MainLayout />}>
              {/* Home is publicly viewable (compliance requirement) */}
              <Route path="/" element={<Home />} />
              <Route 
                path="/anime/:id" 
                element={<AnimeDetails />} 
              />
              <Route 
                path="/profile/:username" 
                element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/settings" 
                element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/recommendations" 
                element={isAuthenticated ? <Recommendations /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/friends" 
                element={isAuthenticated ? <Friends /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/section/:section" 
                element={<AnimeSectionMore />} 
              />
              <Route 
                path="/friends/:username/watched" 
                element={isAuthenticated ? <FriendWatchedList /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/smart-search" 
                element={isAuthenticated ? <SmartSearch /> : <Navigate to="/login" />} 
              />
              
              {/* --- MOVIES MODULE --- */}
              {import.meta.env.VITE_ENABLE_MOVIES === 'true' && (
                <>
                  <Route 
                    path="/movies" 
                    element={isAuthenticated ? <MoviesHome /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/movies/:type/:id" 
                    element={isAuthenticated ? <MovieDetails /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/movies/section/:section" 
                    element={isAuthenticated ? <MovieSectionMore /> : <Navigate to="/login" />} 
                  />
                </>
              )}
            </Route>
          </Routes>

          </div>
        </MediaStatusProvider>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;