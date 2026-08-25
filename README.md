# SecureFlow

Plateforme de gestion de l’assurance transport pour les passagers des compagnies de bus.

SecureFlow centralise l’enregistrement des passagers, le suivi des polices d’assurance, la gestion des agents et la vérification publique des tickets grâce à un QR code.

## Fonctionnalités

- Authentification par nom d’utilisateur ou adresse e-mail.
- Gestion des accès par rôle :
  - **Super administrateur** : gestion globale des assurances, compagnies de transport, passagers, revenus et journaux d’activité.
  - **Administrateur d’assurance** : gestion de son assurance, de ses agents et de ses passagers.
  - **Agent** : enregistrement des passagers depuis une interface adaptée au mobile.
- Création d’un ticket avec QR code pour chaque passager.
- Vérification publique d’une assurance sans connexion avec `/verify/:id`.
- Suivi du statut d’une assurance : en attente, contrat créé, validée ou expirée.
- Tableaux de bord avec statistiques :
  - passagers du jour, de la semaine et du mois ;
  - évolution quotidienne sur les 30 derniers jours ;
  - revenus, primes et commissions ;
  - répartition par assurance, compagnie et destination ;
  - meilleurs agents.
- Gestion des informations légales des assurances selon les besoins du cadre CIMA.
- Envoi d’e-mails pour les notifications, les tickets et les codes de sécurité.
- Réinitialisation du mot de passe par code envoyé par e-mail.
- Rapports et export des données.
- Journalisation des actions importantes.
- Interface en français, responsive et compatible avec les thèmes clair et sombre.

## Technologies

### Frontend

- React 18
- TypeScript
- Vite
- Wouter
- TanStack React Query
- React Hook Form et Zod
- Tailwind CSS
- Radix UI / composants shadcn/ui
- Recharts
- qrcode.react

### Backend

- Node.js
- Express
- TypeScript exécuté avec `tsx`
- Sessions avec `express-session`
- Stockage des sessions PostgreSQL avec `connect-pg-simple`
- Hachage des mots de passe avec `bcryptjs`
- Validation des données avec Zod
- Envoi d’e-mails avec Resend

### Données

- PostgreSQL
- Drizzle ORM
- Drizzle Kit pour la gestion du schéma

## Prérequis

- Node.js 20 ou une version compatible
- PostgreSQL
- Une clé Resend pour l’envoi des e-mails

## Installation

```bash
npm install
```

Configure ensuite les variables d’environnement suivantes dans l’environnement d’exécution :

```text
DATABASE_URL=postgresql://...
SESSION_SECRET=une-valeur-secrete-longue
RESEND_API_KEY=...
```

Ne committez jamais un fichier `.env`, une clé API, un mot de passe ou une valeur secrète dans le dépôt.

## Préparer la base de données

Pousser le schéma Drizzle vers PostgreSQL :

```bash
npm run db:push
```

Au démarrage, l’application initialise les comptes et les données de base nécessaires si elles n’existent pas encore.

## Lancer l’application

En développement :

```bash
npm run dev
```

L’application est servie sur le port `5000` par défaut.

Vérifier les types TypeScript :

```bash
npm run check
```

Construire l’application :

```bash
npm run build
```

Lancer la version construite :

```bash
npm start
```

## Routes principales

### Super administrateur

| Route | Utilisation |
| --- | --- |
| `/` | Tableau de bord global |
| `/insurances` | Gestion des assurances |
| `/transport` | Gestion des compagnies de transport |
| `/passengers` | Liste globale des passagers |
| `/revenue` | Revenus et commissions |
| `/reports` | Rapports et exports |
| `/logs` | Journaux d’activité |
| `/settings` | Paramètres du compte |

### Administrateur d’assurance

| Route | Utilisation |
| --- | --- |
| `/` | Tableau de bord de l’assurance |
| `/agents` | Gestion des agents |
| `/passengers` | Passagers de l’assurance |
| `/stats` | Statistiques |
| `/insurance-info` | Informations légales et garanties |
| `/settings` | Paramètres du compte |

### Agent

L’agent utilise une interface mobile dédiée pour enregistrer les passagers, consulter son historique et générer les tickets.

### Vérification publique

```text
/verify/:id
```

Cette page est accessible sans connexion et permet de vérifier les informations d’une assurance à partir de l’identifiant du ticket ou de son QR code.

## API

Le backend expose une API REST sous le préfixe `/api`.

Principales familles d’API :

- `/api/auth` : connexion, déconnexion, session et réinitialisation du mot de passe ;
- `/api/profile` : profil et changement de mot de passe ;
- `/api/passengers` : enregistrement et consultation des passagers ;
- `/api/insurance` : statistiques, agents et passagers d’une assurance ;
- `/api/admin` : administration globale, revenus, statistiques et exports ;
- `/api/verify` : vérification publique des tickets ;
- `/api/transport-companies` : compagnies de transport actives.

## Structure du projet

```text
client/          Interface React et pages de l’application
server/          Serveur Express, API, base de données et e-mails
shared/          Schéma Drizzle, validations Zod et types partagés
attached_assets/ Fichiers importés et ressources du projet
uploads/         Logos téléversés par l’application
script/          Scripts de build
```

## Sécurité

- Les mots de passe sont stockés sous forme hachée avec bcrypt.
- Les mots de passe ne sont jamais renvoyés dans les réponses de l’API.
- Les routes privées vérifient la session et le rôle de l’utilisateur.
- Les codes de vérification expirent après 10 minutes et ne peuvent être utilisés qu’une fois.
- La demande de réinitialisation utilise une réponse générique afin de ne pas révéler si un compte existe.
- Les secrets doivent être fournis uniquement par les variables d’environnement ou le gestionnaire de secrets de la plateforme.

## Langue et contexte

L’interface est en français et le projet est conçu pour un contexte d’assurance transport en Afrique de l’Ouest, notamment au Bénin. Les montants affichés dans l’interface utilisent le franc CFA.

## Licence

Ce projet est actuellement privé. La licence et les conditions de redistribution doivent être définies par le propriétaire du dépôt.