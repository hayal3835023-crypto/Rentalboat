import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Anchor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BoatCard } from '@/components/BoatCard';
import { CategoryCard } from '@/components/CategoryCard';
import { DestinationCard } from '@/components/DestinationCard';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [popularBoats, setPopularBoats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Seed demo data first
      try {
        await axios.post(`${API}/seed-demo-data`);
      } catch (e) {
        // Demo data might already exist
      }

      const [catsRes, destsRes, boatsRes] = await Promise.all([
        axios.get(`${API}/boats/categories`),
        axios.get(`${API}/boats/destinations`),
        axios.get(`${API}/boats?verified_only=true`)
      ]);

      setCategories(catsRes.data);
      setDestinations(destsRes.data);
      setPopularBoats(boatsRes.data.slice(0, 6));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?city=${searchQuery}`);
    } else {
      navigate('/search');
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/search?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
              <Anchor className="text-white" size={22} />
            </div>
            <span className="font-bold text-xl text-slate-900 hidden sm:block">BoatRental</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-teal-600 font-medium">
              Explorer
            </button>
            <button onClick={() => navigate('/my-bookings')} className="text-slate-600 hover:text-teal-600 font-medium">
              Mes réservations
            </button>
          </div>

          <Button 
            variant="outline" 
            className="rounded-full"
            onClick={() => navigate('/login')}
            data-testid="header-login-btn"
          >
            Connexion
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-50 to-slate-50 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 animate-slide-up">
              Louez le bateau <br className="hidden sm:block" />
              <span className="text-teal-600">de vos rêves</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto animate-slide-up stagger-1">
              Découvrez les plus belles côtes de France à bord de bateaux d'exception
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto animate-slide-up stagger-2">
            <div className="bg-white rounded-full shadow-lg p-2 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <MapPin className="text-teal-600" size={20} />
                <Input
                  type="text"
                  placeholder="Où souhaitez-vous naviguer ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 focus-visible:ring-0 text-base search-input"
                  data-testid="search-input"
                />
              </div>
              <Button 
                type="submit"
                className="rounded-full h-12 px-6 bg-teal-600 hover:bg-teal-700"
                data-testid="search-button"
              >
                <Search size={20} className="mr-2" />
                <span className="hidden sm:inline">Rechercher</span>
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Catégories de bateaux
            </h2>
            <button 
              onClick={() => navigate('/search')}
              className="text-teal-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              Voir tout <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="min-w-[90px] h-[120px] bg-slate-200 rounded-xl skeleton" />
              ))
            ) : (
              categories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={category}
                  onClick={handleCategoryClick}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-10 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Destinations populaires
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-slate-200 rounded-2xl skeleton" />
              ))
            ) : (
              destinations.map((destination) => (
                <DestinationCard key={destination.city} destination={destination} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Popular Boats */}
      <section className="py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Bateaux populaires
            </h2>
            <button 
              onClick={() => navigate('/search')}
              className="text-teal-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              Voir tout <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-slate-200 rounded-2xl skeleton" />
              ))
            ) : (
              popularBoats.map((boat) => (
                <BoatCard key={boat.boat_id} boat={boat} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Vous avez un bateau ?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Rejoignez notre communauté de propriétaires et générez des revenus en louant votre bateau
          </p>
          <Button 
            size="lg"
            className="rounded-full bg-teal-600 hover:bg-teal-700 h-14 px-8 text-lg"
            onClick={() => navigate('/register')}
          >
            Devenir propriétaire
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <Anchor className="text-white" size={18} />
              </div>
              <span className="font-bold text-slate-900">BoatRental France</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2024 BoatRental. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
