import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BookingSuccessPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();

  const [status, setStatus] = useState('checking');
  const [booking, setBooking] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      loadBooking();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`, {
        headers: getAuthHeaders()
      });

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        loadBooking();
        return;
      } else if (response.data.status === 'expired') {
        setStatus('failed');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment:', error);
      setStatus('error');
    }
  };

  const loadBooking = async () => {
    try {
      const response = await axios.get(`${API}/bookings/${bookingId}`, {
        headers: getAuthHeaders()
      });
      setBooking(response.data);
      if (!sessionId) {
        setStatus(response.data.status === 'confirmed' ? 'success' : 'pending');
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === 'checking' && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <Loader2 size={64} className="mx-auto text-teal-600 animate-spin mb-4" />
            <h1 className="text-xl font-bold mb-2">Vérification du paiement...</h1>
            <p className="text-slate-500">Merci de patienter quelques instants</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 animate-slide-up">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Réservation confirmée !</h1>
            <p className="text-slate-500 mb-6">
              Votre réservation a été confirmée avec succès
            </p>

            {booking?.boat && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                <img
                  src={booking.boat.images?.[0]}
                  alt={booking.boat.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h3 className="font-semibold">{booking.boat.name}</h3>
                
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      {format(new Date(booking.start_date), 'dd MMM', { locale: fr })} - {format(new Date(booking.end_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{booking.boat.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{booking.guests} personne{booking.guests > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between font-semibold">
                  <span>Total payé</span>
                  <span className="text-teal-600">
                    {formatPrice(booking.total_price + booking.service_fee)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                className="w-full rounded-full bg-teal-600 hover:bg-teal-700"
                onClick={() => navigate('/my-bookings')}
              >
                Voir mes réservations
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => navigate('/')}
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}

        {(status === 'failed' || status === 'error') && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={48} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Paiement échoué</h1>
            <p className="text-slate-500 mb-6">
              Le paiement n'a pas pu être traité. Veuillez réessayer.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                className="w-full rounded-full bg-teal-600 hover:bg-teal-700"
                onClick={() => navigate(`/boat/${booking?.boat_id || ''}`)}
              >
                Réessayer
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => navigate('/')}
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <h1 className="text-xl font-bold mb-2">Vérification en attente</h1>
            <p className="text-slate-500 mb-6">
              La vérification du paiement prend plus de temps que prévu. Consultez vos réservations pour voir le statut.
            </p>

            <Button
              className="w-full rounded-full bg-teal-600 hover:bg-teal-700"
              onClick={() => navigate('/my-bookings')}
            >
              Voir mes réservations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
