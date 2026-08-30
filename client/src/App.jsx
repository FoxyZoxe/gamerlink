import NotificationWatcher from "./components/NotificationWatcher.jsx";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Friends from "./pages/Friends.jsx";
import Search from "./pages/Search.jsx";
import Messages from "./pages/Messages.jsx";
import Games from "./pages/Games.jsx";
import Notifications from "./pages/Notifications.jsx";
import Profile from "./pages/Profile.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import Settings from "./pages/Settings.jsx";
import Squads from "./pages/Squads.jsx";

function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
  <NotificationWatcher />

  <HashRouter>
          <Routes>

            <Route
              path="/connexion"
              element={
                <AuthGate>
                  <Login />
                </AuthGate>
              }
            />

            <Route
              path="/inscription"
              element={
                <AuthGate>
                  <Register />
                </AuthGate>
              }
            />

            <Route element={<AppLayout />}>

              <Route path="/" element={<Home />} />

              <Route
                path="/amis"
                element={<Friends />}
              />

              <Route
                path="/trouver"
                element={<Search />}
              />

              <Route
                path="/messages"
                element={<Messages />}
              />

              <Route
                path="/jeux"
                element={<Games />}
              />

              <Route
                path="/squads"
                element={<Squads />}
              />

              <Route
                path="/notifications"
                element={<Notifications />}
              />

              <Route
                path="/profil"
                element={<Profile />}
              />

              {/* Profil public d'un joueur */}
              <Route
                path="/profil/:id"
                element={<PublicProfile />}
              />

              <Route
                path="/parametres"
                element={<Settings />}
              />

            </Route>

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />

          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}