import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Ship, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MyBoatsPage() {
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boatToDelete, setBoatToDelete] = useState(null);

  useEffect(() => {
    loadMyBoats();
  }, []);

  const loadMyBoats = async () => {
    try {
      const response = await axios.get(`${API}/boats/owner/my-boats`, {
        headers: getAuthHeaders()
      });
      setBoats(response.data);
    } catch (error) {
      console.error('Error loading boats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!boatToDelete) return;
    
    try {
      await axios.delete(`${API}/boats/${boatToDelete}`, {
        headers: getAuthHeaders()
      });
      toast.success('Annonce supprimée');
      loadMyBoats();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setBoatToDelete(null);
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
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Mes annonces</h1>
          </div>
          <Button 
            className="rounded-full bg-teal-600 hover:bg-teal-700"
            onClick={() => navigate('/owner/boats/new')}
            data-testid="add-boat-btn"
          >
            <Plus size={18} className="mr-2" />
            Publier
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl skeleton" />
            ))}
          </div>
        ) : boats.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ship size={48} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Aucune annonce</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Vous n'avez pas encore publié de bateau. Commencez à gagner de l'argent en louant votre bateau !
            </p>
            <Button 
              size="lg"
              className="rounded-full bg-teal-600 hover:bg-teal-700"
              onClick={() => navigate('/owner/boats/new')}
            >
              <Plus size={20} className="mr-2" />
              Publier mon premier bateau
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {boats.map((boat) => (
              <div 
                key={boat.boat_id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  <img
                    src={boat.images?.[0] || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400'}
                    alt={boat.name}
                    className="w-32 h-32 object-cover cursor-pointer"
                    onClick={() => navigate(`/boat/${boat.boat_id}`)}
                  />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{boat.name}</h3>
                        <p className="text-sm text-slate-500">{boat.city} • {boat.category}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/boat/${boat.boat_id}`)}>
                            <Eye size={16} className="mr-2" />
                            Voir l'annonce
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/owner/boats/${boat.boat_id}/edit`)}>
                            <Edit size={16} className="mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setBoatToDelete(boat.boat_id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 size={16} className="mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-lg font-bold text-teal-600">
                        {formatPrice(boat.price_per_day)}/jour
                      </span>
                      {boat.is_verified ? (
                        <Badge className="bg-green-100 text-green-700">Vérifié</Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span>{boat.capacity} pers.</span>
                      <span>{boat.length}m</span>
                      <span>{boat.review_count} avis</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les réservations en cours seront annulées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
