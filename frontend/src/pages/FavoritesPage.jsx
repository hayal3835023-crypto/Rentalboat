import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoatCard } from '@/components/BoatCard';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        headers: getAuthHeaders()
      });
      setBoats(response.data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Mes favoris</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-slate-200 rounded-2xl skeleton" />
            ))}
          </div>
        ) : boats.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Aucun favori</h2>
            <p className="text-slate-500 mb-6">
              Vous n'avez pas encore ajouté de bateaux à vos favoris
            </p>
            <Button
              className="rounded-full bg-teal-600 hover:bg-teal-700"
              onClick={() => navigate('/search')}
            >
              Explorer les bateaux
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {boats.map((boat) => (
              <BoatCard 
                key={boat.boat_id} 
                boat={boat}
                onFavoriteChange={loadFavorites}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
