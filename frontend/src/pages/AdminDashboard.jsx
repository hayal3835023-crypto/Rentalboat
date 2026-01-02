import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Ship, Calendar, Euro, TrendingUp, 
  CheckCircle, Clock, XCircle, Eye, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Code administrateur (à changer)
const ADMIN_CODE = 'admin2024';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [boats, setBoats] = useState([]);

  useEffect(() => {
    // Check if admin is already authenticated
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminCode === ADMIN_CODE) {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      loadAdminData();
    } else {
      alert('Code administrateur incorrect');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes, usersRes, boatsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/bookings`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/boats`)
      ]);

      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setUsers(usersRes.data);
      setBoats(boatsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(price);
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

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold">Administration</h1>
              <p className="text-slate-500 mt-1">Accès réservé au propriétaire</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Code administrateur</label>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Entrez le code"
                  className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  data-testid="admin-code-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700"
                data-testid="admin-login-btn"
              >
                Accéder au tableau de bord
              </Button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-6">
              Code par défaut: admin2024
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-800 rounded-full"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Tableau de bord Admin</h1>
              <p className="text-slate-400 text-sm">BoatRental France</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="text-white border-slate-600 hover:bg-slate-800"
            onClick={() => {
              sessionStorage.removeItem('admin_auth');
              setIsAuthenticated(false);
            }}
          >
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Revenus (Commission)
              </CardTitle>
              <Euro className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">
                {formatPrice(stats?.total_commission || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                10% sur {formatPrice(stats?.total_bookings_value || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Réservations
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_bookings || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.confirmed_bookings || 0} confirmées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Utilisateurs
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.owners_count || 0} propriétaires
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Bateaux
              </CardTitle>
              <Ship className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_boats || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.verified_boats || 0} vérifiés
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="boats">Bateaux</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Toutes les réservations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Bateau</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const statusInfo = getStatusBadge(booking.status);
                      return (
                        <TableRow key={booking.booking_id}>
                          <TableCell className="font-mono text-xs">
                            {booking.booking_id.slice(-8)}
                          </TableCell>
                          <TableCell>{booking.user_name || 'N/A'}</TableCell>
                          <TableCell>{booking.boat_name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(booking.start_date), 'dd/MM', { locale: fr })} - {format(new Date(booking.end_date), 'dd/MM/yy', { locale: fr })}
                          </TableCell>
                          <TableCell>{formatPrice(booking.total_price)}</TableCell>
                          <TableCell className="text-teal-600 font-medium">
                            {formatPrice(booking.service_fee)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {bookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                          Aucune réservation pour le moment
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Tous les utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Inscrit le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          {user.is_owner ? (
                            <Badge className="bg-teal-100 text-teal-800">Propriétaire</Badge>
                          ) : (
                            <Badge variant="outline">Locataire</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                          Aucun utilisateur
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Boats Tab */}
          <TabsContent value="boats">
            <Card>
              <CardHeader>
                <CardTitle>Tous les bateaux</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bateau</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Prix/jour</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boats.map((boat) => (
                      <TableRow key={boat.boat_id}>
                        <TableCell className="font-medium">{boat.name}</TableCell>
                        <TableCell>{boat.owner_name || 'N/A'}</TableCell>
                        <TableCell className="capitalize">{boat.category}</TableCell>
                        <TableCell>{boat.city}</TableCell>
                        <TableCell>{formatPrice(boat.price_per_day)}</TableCell>
                        <TableCell>
                          {boat.is_verified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle size={12} className="mr-1" />
                              Vérifié
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock size={12} className="mr-1" />
                              En attente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/boat/${boat.boat_id}`)}
                          >
                            <Eye size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {boats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                          Aucun bateau
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
