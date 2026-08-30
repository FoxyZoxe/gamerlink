import React from "react";

import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext.jsx";

import { ToastProvider } from "./context/ToastContext.jsx";

import AppLayout from "./components/AppLayout.jsx";
import NotificationWatcher from "./components/NotificationWatcher.jsx";
import GameDetectionWatcher from "./components/GameDetectionWatcher.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Friends from "./pages/Friends.jsx";
import Search from "./pages/Search.jsx";
import Messages from "./pages/Messages.jsx";
import Games from "./pages/Games.jsx";
import GameDetails from "./pages/GameDetails.jsx";
import Squads from "./pages/Squads.jsx";
import SquadDetails from "./pages/SquadDetails.jsx";
import Notifications from "./pages/Notifications.jsx";
import Profile from "./pages/Profile.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import Settings from "./pages/Settings.jsx";


/* ==========================================================
   INITIALISATION DU THÈME
   ========================================================== */

function ThemeInitializer() {
  React.useEffect(() => {
    const savedTheme =
      localStorage.getItem("gamerlink-theme") || "dark";

    const savedAccent =
      localStorage.getItem("gamerlink-accent") || "violet";

    const savedAnimations =
      localStorage.getItem("gamerlink-animations");

    document.documentElement.dataset.theme =
      savedTheme;

    document.documentElement.dataset.accent =
      savedAccent;

    document.documentElement.dataset.animations =
      savedAnimations === "false"
        ? "off"
        : "on";
  }, []);

  return null;
}


/* ==========================================================
   AUTH GATE
   ========================================================== */

function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}


/* ==========================================================
   APPLICATION
   ========================================================== */

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>

        {/* ==================================================
            INITIALISATION DU THÈME
        ================================================== */}

        <ThemeInitializer />

        {/* ==================================================
            SURVEILLANCE DES NOTIFICATIONS
        ================================================== */}

        <NotificationWatcher />

        {/* ==================================================
            DÉTECTION AUTOMATIQUE DES JEUX WINDOWS
        ================================================== */}

        <GameDetectionWatcher />

        <HashRouter>
          <Routes>

            {/* ==================================================
                CONNEXION
            ================================================== */}

            <Route
              path="/connexion"
              element={
                <AuthGate>
                  <Login />
                </AuthGate>
              }
            />

            {/* ==================================================
                INSCRIPTION
            ================================================== */}

            <Route
              path="/inscription"
              element={
                <AuthGate>
                  <Register />
                </AuthGate>
              }
            />

            {/* ==================================================
                APPLICATION
            ================================================== */}

            <Route element={<AppLayout />}>

              {/* ACCUEIL */}

              <Route
                path="/"
                element={<Home />}
              />

              {/* AMIS */}

              <Route
                path="/amis"
                element={<Friends />}
              />

              {/* RECHERCHE */}

              <Route
                path="/trouver"
                element={<Search />}
              />

              {/* MESSAGES */}

              <Route
                path="/messages"
                element={<Messages />}
              />

              {/* ==================================================
                  JEUX
              ================================================== */}

              <Route
                path="/jeux"
                element={<Games />}
              />

              <Route
                path="/jeux/:id"
                element={<GameDetails />}
              />

              {/* ==================================================
                  SQUADS
              ================================================== */}

              <Route
                path="/squads"
                element={<Squads />}
              />

              <Route
                path="/squads/:id"
                element={<SquadDetails />}
              />

              {/* ==================================================
                  NOTIFICATIONS
              ================================================== */}

              <Route
                path="/notifications"
                element={<Notifications />}
              />

              {/* ==================================================
                  PROFIL
              ================================================== */}

              <Route
                path="/profil"
                element={<Profile />}
              />

              <Route
                path="/profil/:id"
                element={<PublicProfile />}
              />

              {/* ==================================================
                  PARAMÈTRES
              ================================================== */}

              <Route
                path="/parametres"
                element={<Settings />}
              />

            </Route>

            {/* ==================================================
                ROUTE INCONNUE
            ================================================== */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>
        </HashRouter>

      </ToastProvider>
    </AuthProvider>
  );
}