import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser, checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = window.location.hash;
        const sessionId = hash.split('session_id=')[1]?.split('&')[0];
        
        if (!sessionId) {
          navigate('/');
          return;
        }

        // Call backend to exchange session
        const response = await axios.post(`${API}/auth/session`, {}, {
          headers: { 'X-Session-ID': sessionId },
          withCredentials: true
        });

        setUser(response.data);
        
        // Clear hash and redirect to home
        window.history.replaceState(null, '', '/');
        navigate('/', { replace: true, state: { user: response.data } });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    processSession();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Connexion en cours...</p>
      </div>
    </div>
  );
};
