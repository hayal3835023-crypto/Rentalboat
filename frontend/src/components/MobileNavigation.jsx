import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Calendar, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const MobileNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/' },
    { icon: Search, label: 'Recherche', path: '/search' },
    { icon: Calendar, label: 'Réservations', path: '/my-bookings' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profil', path: user ? '/profile' : '/login' }
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Hide on auth pages
  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center z-50 md:hidden" data-testid="mobile-navigation">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center gap-1 px-4 py-2 mobile-nav-item ${
            isActive(item.path) ? 'active text-teal-600' : 'text-slate-400'
          }`}
          data-testid={`nav-${item.label.toLowerCase()}`}
        >
          <item.icon size={22} strokeWidth={isActive(item.path) ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
