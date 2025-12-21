import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, ChevronRight, Ship } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`, {
        headers: getAuthHeaders()
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-800' },
      completed: { label: 'Terminée', className: 'bg-slate-100 text-slate-800' }
    };
    return variants[status] || variants.pending;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const upcomingBookings = bookings.filter(b => 
    ['pending', 'confirmed'].includes(b.status) && new Date(b.start_date) >= new Date()
  );
  const pastBookings = bookings.filter(b => 
    b.status === 'completed' || new Date(b.end_date) < new Date()
  );

  const BookingCard = ({ booking }) => {
    const statusInfo = getStatusBadge(booking.status);
    
    return (
      <div 
        className="bg-white rounded-2xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/boat/${booking.boat_id}`)}
      >
        <div className="flex">
          <img
            src={booking.boat?.images?.[0] || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400'}
            alt={booking.boat?.name}
            className="w-28 h-full object-cover"
          />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold line-clamp-1">{booking.boat?.name}</h3>
              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            </div>

            <div className="space-y-1 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>
                  {format(new Date(booking.start_date), 'dd MMM', { locale: fr })} - {format(new Date(booking.end_date), 'dd MMM', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{booking.boat?.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} />
                <span>{booking.guests} personne{booking.guests > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="font-semibold text-teal-600">
                {formatPrice(booking.total_price + booking.service_fee)}
              </span>
              <ChevronRight size={18} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-xl font-bold">Mes réservations</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl skeleton" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ship size={32} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Aucune réservation</h2>
            <p className="text-slate-500 mb-6">
              Vous n'avez pas encore effectué de réservation
            </p>
            <Button
              className="rounded-full bg-teal-600 hover:bg-teal-700"
              onClick={() => navigate('/search')}
            >
              Explorer les bateaux
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upcoming">
                À venir ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Passées ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  Aucune réservation à venir
                </p>
              ) : (
                upcomingBookings.map((booking) => (
                  <BookingCard key={booking.booking_id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastBookings.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  Aucune réservation passée
                </p>
              ) : (
                pastBookings.map((booking) => (
                  <BookingCard key={booking.booking_id} booking={booking} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
