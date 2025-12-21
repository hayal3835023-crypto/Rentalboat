import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Filter, Map, List, X, Users, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BoatCard } from '@/components/BoatCard';
import { CategoryCard } from '@/components/CategoryCard';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom price marker
const createPriceMarker = (price) => {
  return L.divIcon({
    className: 'price-marker-container',
    html: `<div class="price-marker">${price}€</div>`,
    iconSize: [60, 30],
    iconAnchor: [30, 15]
  });
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [boats, setBoats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [priceRange, setPriceRange] = useState([0, 3000]);
  const [capacity, setCapacity] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Map center (France)
  const mapCenter = [43.5, 5.5];

  useEffect(() => {
    loadCategories();
    loadBoats();
  }, []);

  useEffect(() => {
    loadBoats();
  }, [selectedCategory, city, priceRange, capacity, verifiedOnly]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API}/boats/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBoats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (city) params.append('city', city);
      if (priceRange[0] > 0) params.append('min_price', priceRange[0]);
      if (priceRange[1] < 3000) params.append('max_price', priceRange[1]);
      if (capacity > 0) params.append('capacity', capacity);
      if (verifiedOnly) params.append('verified_only', 'true');

      const response = await axios.get(`${API}/boats?${params.toString()}`);
      setBoats(response.data);
    } catch (error) {
      console.error('Error loading boats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (catId) => {
    setSelectedCategory(selectedCategory === catId ? '' : catId);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setCity('');
    setPriceRange([0, 3000]);
    setCapacity(0);
    setVerifiedOnly(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++;
    if (city) count++;
    if (priceRange[0] > 0 || priceRange[1] < 3000) count++;
    if (capacity > 0) count++;
    if (verifiedOnly) count++;
    return count;
  }, [selectedCategory, city, priceRange, capacity, verifiedOnly]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full"
              data-testid="back-button"
            >
              <ArrowLeft size={20} />
            </button>

            <Input
              type="text"
              placeholder="Rechercher une ville..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="flex-1 rounded-full h-11"
              data-testid="city-search-input"
            />

            {/* Mobile Filter Button */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden rounded-full relative">
                  <SlidersHorizontal size={18} />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>
                <FilterContent 
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  capacity={capacity}
                  setCapacity={setCapacity}
                  verifiedOnly={verifiedOnly}
                  setVerifiedOnly={setVerifiedOnly}
                  onClear={clearFilters}
                  onApply={() => setFiltersOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* View Toggle */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-full ${viewMode === 'map' ? 'bg-white shadow' : ''}`}
              >
                <Map size={18} />
              </button>
            </div>
          </div>

          {/* Categories Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-3 pt-4 scrollbar-hide">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onClick={handleCategoryClick}
                isSelected={selectedCategory === cat.id}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-72 p-4 bg-white border-r border-slate-200 min-h-[calc(100vh-180px)]">
            <FilterContent 
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              capacity={capacity}
              setCapacity={setCapacity}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              onClear={clearFilters}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {boats.length} bateau{boats.length !== 1 ? 'x' : ''} trouvé{boats.length !== 1 ? 's' : ''}
              </h2>

              {/* Mobile Map Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="md:hidden rounded-full"
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              >
                {viewMode === 'list' ? <Map size={16} className="mr-2" /> : <List size={16} className="mr-2" />}
                {viewMode === 'list' ? 'Carte' : 'Liste'}
              </Button>
            </div>

            {/* Content */}
            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[4/3] bg-slate-200 rounded-2xl skeleton" />
                  ))
                ) : boats.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-slate-500">Aucun bateau trouvé avec ces critères</p>
                    <Button variant="link" onClick={clearFilters} className="mt-2 text-teal-600">
                      Effacer les filtres
                    </Button>
                  </div>
                ) : (
                  boats.map((boat) => (
                    <BoatCard key={boat.boat_id} boat={boat} />
                  ))
                )}
              </div>
            ) : (
              <div className="h-[calc(100vh-280px)] rounded-2xl overflow-hidden">
                <MapContainer 
                  center={mapCenter} 
                  zoom={7} 
                  className="h-full w-full"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {boats.map((boat) => (
                    <Marker
                      key={boat.boat_id}
                      position={[boat.latitude, boat.longitude]}
                      icon={createPriceMarker(boat.price_per_day)}
                    >
                      <Popup>
                        <div className="w-48">
                          <img 
                            src={boat.images?.[0]} 
                            alt={boat.name}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                          />
                          <h3 className="font-semibold text-sm">{boat.name}</h3>
                          <p className="text-xs text-slate-500">{boat.city}</p>
                          <p className="text-sm font-bold text-teal-600 mt-1">{boat.price_per_day}€/jour</p>
                          <Button 
                            size="sm" 
                            className="w-full mt-2 rounded-full"
                            onClick={() => navigate(`/boat/${boat.boat_id}`)}
                          >
                            Voir détails
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Filter Content Component
const FilterContent = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  capacity,
  setCapacity,
  verifiedOnly,
  setVerifiedOnly,
  onClear,
  onApply
}) => {
  return (
    <div className="space-y-6 p-4">
      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Prix par jour</Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={3000}
          step={50}
          className="mb-2"
        />
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{priceRange[0]}€</span>
          <span>{priceRange[1]}€</span>
        </div>
      </div>

      {/* Capacity */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Capacité minimum</Label>
        <Select value={capacity.toString()} onValueChange={(v) => setCapacity(parseInt(v))}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Nombre de personnes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tous</SelectItem>
            <SelectItem value="2">2+ personnes</SelectItem>
            <SelectItem value="4">4+ personnes</SelectItem>
            <SelectItem value="6">6+ personnes</SelectItem>
            <SelectItem value="8">8+ personnes</SelectItem>
            <SelectItem value="10">10+ personnes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Verified Only */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Propriétaires vérifiés</Label>
        <Switch
          checked={verifiedOnly}
          onCheckedChange={setVerifiedOnly}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1 rounded-full" onClick={onClear}>
          Effacer
        </Button>
        {onApply && (
          <Button className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700" onClick={onApply}>
            Appliquer
          </Button>
        )}
      </div>
    </div>
  );
};
