# BoatRental France - Requirements & Architecture

## Problem Statement
Site de location de bateaux en France avec:
- Authentification JWT + Google OAuth
- Intégration paiement Stripe
- Carte interactive Leaflet
- Recherche et filtres de bateaux
- Système de réservation
- Profil utilisateur avec favoris
- Messagerie propriétaire/locataire
- Données de démonstration

## Architecture

### Backend (FastAPI + MongoDB)
- **Auth**: JWT tokens + Google OAuth via Emergent Auth
- **Models**: User, Boat, Booking, Message, Review, Favorite, PaymentTransaction
- **Endpoints**:
  - `/api/auth/*` - Authentification (register, login, session, me, logout)
  - `/api/boats/*` - CRUD bateaux, catégories, destinations
  - `/api/bookings/*` - Création et gestion réservations
  - `/api/favorites/*` - Ajout/suppression favoris
  - `/api/messages/*` - Messagerie
  - `/api/reviews/*` - Avis
  - `/api/payments/*` - Checkout Stripe

### Frontend (React + Tailwind + Shadcn)
- **Pages**:
  - HomePage - Hero, catégories, destinations, bateaux populaires
  - SearchPage - Filtres, liste, carte Leaflet
  - BoatDetailPage - Galerie, infos, réservation
  - BookingPage - Sélection dates, passagers, paiement
  - ProfilePage - Infos utilisateur, menu
  - FavoritesPage - Bateaux favoris
  - MyBookingsPage - Réservations
  - MessagesPage - Chat
  - LoginPage / RegisterPage - Auth

## Completed Tasks ✅
1. Backend complet avec tous les endpoints
2. Auth JWT + Google OAuth
3. Intégration Stripe paiement
4. Frontend responsive mobile-first
5. Carte interactive Leaflet
6. Design teal/turquoise fidèle au mockup
7. Données de démonstration (6 bateaux)
8. Navigation mobile bottom bar
9. **Dashboard propriétaire** - Publication et gestion des annonces
   - Page "Mes annonces" avec liste des bateaux
   - Formulaire de création/modification de bateau
   - Option skipper, équipements, photos multiples
   - Suppression d'annonce avec confirmation

## Demo Credentials
- Email: proprietaire@demo.fr
- Password: demo123

## Next Action Items
1. Ajouter système de notifications en temps réel
2. Dashboard propriétaire pour gérer les bateaux
3. Calendrier de disponibilité avancé
4. Système d'avis avec photos
5. Filtres de recherche plus avancés (équipements, dates)
6. PWA pour expérience mobile native
