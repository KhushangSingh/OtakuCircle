import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- Contexts ---
import { NotificationProvider } from './components/NotificationProvider';

// --- Components ---
import Navbar from './components/Navbar';

// --- Pages ---
import Login from './pages/Login';
import Home from './pages/Home';
import AnimeDetails from './pages/AnimeDetails';
import Profile from './pages/Profile';
import Recommendations from './pages/Recommendations';
import Friends from './pages/Friends';
import FriendWatchedList from './pages/FriendWatchedList';
import AnimeSectionMore from './pages/AnimeSectionMore';
import SmartSearch from './pages/SmartSearch';
import MoviesHome from './pages/MoviesHome';
import MovieDetails from './pages/MovieDetails';
// Layout Wrapper (Applied to protected routes)
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
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          
          <Routes>
            {/* --- Public Route --- */}
            <Route path="/login" element={<Login />} />

            {/* --- Protected Routes (Require Auth) --- */}
            <Route element={<MainLayout />}>
              <Route 
                path="/" 
                element={isAuthenticated ? <Home /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/anime/:id" 
                element={isAuthenticated ? <AnimeDetails /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/profile/:username" 
                element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} 
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
                element={isAuthenticated ? <AnimeSectionMore /> : <Navigate to="/login" />} 
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
                </>
              )}
            </Route>
          </Routes>

        </div>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;