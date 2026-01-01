import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Heart, Calendar, CreditCard, LogOut, ChevronRight, 
  Settings, Camera, Bell, Ship
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    toast.success('Déconnexion réussie');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: editName, phone: editPhone });
      setEditOpen(false);
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: Ship, label: 'Mes annonces', path: '/owner/boats', color: 'text-teal-600' },
    { icon: Heart, label: 'Mes favoris', path: '/favorites', color: 'text-red-500' },
    { icon: Calendar, label: 'Mes réservations', path: '/my-bookings', color: 'text-blue-500' },
    { icon: CreditCard, label: 'Moyens de paiement', path: '#', color: 'text-purple-500' },
    { icon: Bell, label: 'Notifications', path: '#', color: 'text-orange-500' },
    { icon: Settings, label: 'Paramètres', path: '#', color: 'text-slate-500' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-teal-600 pt-12 pb-20 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Mon profil</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-12">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="text-2xl bg-teal-100 text-teal-700">
                  {user?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white">
                <Camera size={16} />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-slate-500">{user?.email}</p>
              {user?.is_owner && (
                <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full mt-1">
                  <Anchor size={12} />
                  Propriétaire
                </span>
              )}
            </div>
          </div>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full rounded-full">
                Modifier le profil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le profil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 rounded-xl"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <Button
                  className="w-full rounded-full bg-teal-600 hover:bg-teal-700"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
          {menuItems.map((item, index) => (
            <div key={item.label}>
              <button
                onClick={() => item.path !== '#' && navigate(item.path)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 text-left"
                data-testid={`menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                <ChevronRight size={20} className="text-slate-400" />
              </button>
              {index < menuItems.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full rounded-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleLogout}
          data-testid="logout-button"
        >
          <LogOut size={18} className="mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
