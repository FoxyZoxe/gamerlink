# GamerLink — V0.1

Hub social pour joueurs PC : voir tes amis, discuter, trouver des joueurs et
organiser tes sessions, en un seul endroit.

Ce dépôt contient la **V0.2** telle que définie dans le cahier des charges
(section 24) : interface GamerLink, comptes, profils, système d'amis,
recherche de joueurs, messagerie basique, notifications, navigation complète.

## Architecture

```
gamerlink/
├── server/     API REST (Express) — auth, users, friends, messages, notifications, games
│   └── src/
│       ├── db.js            couche de persistance (fichier JSON pour le MVP)
│       ├── middleware/       auth JWT
│       └── routes/           un fichier par domaine métier
└── client/     Interface (React + Vite) — thème sombre violet/bleu électrique
    └── src/
        ├── context/           session utilisateur, toasts
        ├── components/        Sidebar, Avatar (anneau de présence), layout
        ├── pages/              un fichier par écran de navigation
        └── lib/                appels API, statuts
```

Chaque brique (frontend, backend, auth, base de données, notifications) est
séparée pour pouvoir faire évoluer l'app sans tout casser — conformément à la
section 20 du cahier des charges. Le passage à une vraie base de données
(Postgres/SQLite) ou à des websockets temps réel (V0.2) se fera uniquement
dans `server/src/db.js` et dans les routes concernées, sans toucher au
frontend.

## Lancer le projet en local

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent.

**1. Backend**

```bash
cd server
npm install
npm run dev
```

L'API tourne sur `http://localhost:4000`. Les données sont stockées dans
`server/src/data/gamerlink.json` (créé automatiquement au premier lancement).

**2. Frontend** (dans un second terminal)

```bash
cd client
npm install
npm run dev
```

L'app s'ouvre sur `http://localhost:5173`. Crée un compte, et tu es dans
GamerLink.

## Ce qui est fait en V0.2

- Interface complète : sidebar réductible, thème sombre violet/bleu néon,
  glassmorphism, coins arrondis, anneau de présence animé sur les avatars.
- Comptes : inscription, connexion, déconnexion, modification du profil.
  Mots de passe hashés avec bcrypt, jamais stockés en clair.
- Profil GamerLink : photo (placeholder), description, jeux favoris, statut,
  compteur d'amis et de temps de jeu.
- Système d'amis complet : recherche, demande, acceptation, refus,
  suppression, blocage.
- Recherche de joueurs par jeu, langue et micro, avec score de compatibilité.
- Messagerie privée avec conversations, historique, compteur de non-lus.
- Notifications (demandes d'amis, messages) marquables comme lues.
- Retours visuels sur chaque action importante ("✓ Demande envoyée", etc.)
- Paramètres : compte, apparence, notifications, confidentialité, jeu.
- Squads : création, rejoindre/quitter, membres, invitations et fermeture.
- Jeux V0.2 : jeu actif manuel, statut « en jeu » et bibliothèque enrichie.

## Ce qui n'est pas encore fait (roadmap du cahier des charges)

- **V0.3** — Détection automatique réelle des jeux lancés sur le PC via le futur
  module desktop, salon vocal et statistiques avancées.
  La V0.2 fournit déjà le statut « en jeu », les squads et les invitations ;
  la détection de processus nécessite encore une couche desktop (Electron/Tauri).
- **V0.3** — Salon vocal, statistiques avancées.
- **Temps réel** — la messagerie et les notifications sont actuellement en
  polling ; passer à Socket.IO ou WebSockets natifs est le prochain chantier
  naturel, isolé dans une nouvelle couche `realtime/` sans toucher aux routes
  REST existantes.
- **Application Windows installable** (section 2) — ce dépôt est une web app
  React + API Node. Pour en faire une vraie app de bureau Windows :
  1. Empaqueter le frontend avec **Electron** ou **Tauri** (recommandé pour
     un exécutable plus léger).
  2. Lancer le serveur Express en local (ou embarqué dans le process
     Electron) au démarrage de l'app.
  3. Utiliser `electron-builder` (ou l'équivalent Tauri) pour générer un
     installeur `.exe` avec icône et raccourcis Bureau/menu Démarrer.
  Cette étape nécessite un environnement Windows (ou une CI multi-plateforme)
  pour compiler l'installeur — je peux te fournir la configuration Electron
  complète dès que tu es prêt à passer à cette étape.

## Sécurité (section 22)

- Mots de passe hashés avec bcrypt (12 rounds), jamais stockés en clair.
- Authentification par JWT, vérifiée sur chaque route protégée.
- Toutes les entrées sont validées côté serveur (aucune confiance dans les
  données envoyées par le client).
- Aucun mot de passe ni token n'est jamais renvoyé dans les réponses API.
