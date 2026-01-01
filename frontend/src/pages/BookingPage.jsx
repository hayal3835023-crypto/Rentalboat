import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Check, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BookingPage() {
  const { boatId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();

  const [boat, setBoat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [startDate, setStartDate] = useState(addDays(new Date(), 1));
  const [endDate, setEndDate] = useState(addDays(new Date(), 2));
  const [guests, setGuests] = useState(2);
  const [withSkipper, setWithSkipper] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBoat();
  }, [boatId]);

  const loadBoat = async () => {
    try {
      const response = await axios.get(`${API}/boats/${boatId}`);
      setBoat(response.data);
    } catch (error) {
      toast.error('Impossible de charger le bateau');
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const days = differenceInDays(endDate, startDate);
  const basePrice = boat ? boat.price_per_day * days : 0;
  const skipperPrice = withSkipper && boat ? boat.skipper_price * days : 0;
  const totalPrice = basePrice + skipperPrice;
  const serviceFee = Math.round(totalPrice * 0.10); // Commission 10%
  const grandTotal = totalPrice + serviceFee;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleSubmit = async () => {
    if (days < 1) {
      toast.error('Veuillez sélectionner une période valide');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/bookings`, {
        boat_id: boatId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        guests,
        with_skipper: withSkipper,
        message: message || null
      }, {
        headers: getAuthHeaders()
      });

      const bookingId = response.data.booking_id;

      // Create checkout session
      const checkoutResponse = await axios.post(`${API}/payments/checkout`, {
        booking_id: bookingId,
        origin_url: window.location.origin
      }, {
        headers: getAuthHeaders()
      });

      // Redirect to Stripe
      window.location.href = checkoutResponse.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réservation');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!boat) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Réservation</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Boat Summary */}
        <div className="bg-white rounded-2xl p-4 flex gap-4 mb-6 border border-slate-200">
          <img
            src={boat.images?.[0] || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400'}
            alt={boat.name}
            className="w-24 h-24 rounded-xl object-cover"
          />
          <div className="flex-1">
            <h2 className="font-semibold mb-1">{boat.name}</h2>
            <p className="text-sm text-slate-500">{boat.city}</p>
            <p className="text-teal-600 font-semibold mt-2">
              {formatPrice(boat.price_per_day)}/jour
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-teal-600" />
            Dates de location
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-500 mb-2 block">Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start rounded-xl h-12">
                    {format(startDate, 'dd MMM yyyy', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date >= endDate) {
                        setEndDate(addDays(date, 1));
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-sm text-slate-500 mb-2 block">Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start rounded-xl h-12">
                    {format(endDate, 'dd MMM yyyy', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date <= startDate}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">
            {days} jour{days > 1 ? 's' : ''} de location
          </p>
        </div>

        {/* Guests */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-teal-600" />
            Nombre de personnes
          </h3>

          <Select value={guests.toString()} onValueChange={(v) => setGuests(parseInt(v))}>
            <SelectTrigger className="rounded-xl h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(boat.capacity)].map((_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1} personne{i > 0 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Skipper Option */}
        {boat.has_skipper && (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <Anchor size={20} className="text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold">Avec skipper</p>
                  <p className="text-sm text-slate-500">+{formatPrice(boat.skipper_price)}/jour</p>
                </div>
              </div>
              <Switch
                checked={withSkipper}
                onCheckedChange={setWithSkipper}
                data-testid="skipper-switch"
              />
            </div>
          </div>
        )}

        {/* Message */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
          <h3 className="font-semibold mb-4">Message au propriétaire</h3>
          <Textarea
            placeholder="Présentez-vous et décrivez votre projet de navigation..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-xl min-h-[100px]"
          />
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200">
          <h3 className="font-semibold mb-4">Récapitulatif</h3>

          <div className="space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>{formatPrice(boat.price_per_day)} x {days} jour{days > 1 ? 's' : ''}</span>
              <span>{formatPrice(basePrice)}</span>
            </div>

            {withSkipper && (
              <div className="flex justify-between text-slate-600">
                <span>Skipper x {days} jour{days > 1 ? 's' : ''}</span>
                <span>{formatPrice(skipperPrice)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Commission plateforme (10%)</span>
              <span>{formatPrice(serviceFee)}</span>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-teal-600">{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-lg"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="confirm-booking-btn"
        >
          {submitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={20} className="mr-2" />
              Confirmer et payer
            </>
          )}
        </Button>

        <p className="text-center text-sm text-slate-500 mt-4">
          Paiement sécurisé par Stripe
        </p>
      </div>
    </div>
  );
}
