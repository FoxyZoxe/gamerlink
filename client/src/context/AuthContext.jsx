import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  api,
  getToken,
  setToken,
} from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==========================================================
  // INITIALISATION
  // ==========================================================

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await api.me();

        setUser(user);
      } catch (error) {
        console.error(
          "❌ Erreur récupération utilisateur :",
          error
        );

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  // ==========================================================
  // CONNEXION
  // ==========================================================

  const login = useCallback(
    async (identifier, password) => {
      const { token, user } =
        await api.login({
          identifier,
          password,
        });

      setToken(token);
      setUser(user);
    },
    []
  );

  // ==========================================================
  // INSCRIPTION
  // ==========================================================

  const register = useCallback(
    async (payload) => {
      const { token, user } =
        await api.register(payload);

      setToken(token);
      setUser(user);
    },
    []
  );

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Même si l'appel échoue,
      // on déconnecte localement.
    }

    setToken(null);
    setUser(null);
  }, []);

  // ==========================================================
  // RAFRAÎCHIR L'UTILISATEUR
  // ==========================================================

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.me();

      setUser(user);

      return user;
    } catch (error) {
      console.error(
        "❌ Erreur refresh utilisateur :",
        error
      );

      return null;
    }
  }, []);

  // ==========================================================
  // 🎮 JEU ACTUEL
  // ==========================================================

  const currentGame =
    user?.current_game ||
    user?.currentGame ||
    null;

  // ==========================================================
  // 🎮 MODIFIER LE JEU ACTUEL
  // ==========================================================

  const setCurrentGame = useCallback((game) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      return {
        ...previousUser,

        current_game: game,
        currentGame: game,
      };
    });
  }, []);

  // ==========================================================
  // ÉCOUTE DES CHANGEMENTS DE JEU
  // ==========================================================

  useEffect(() => {
    function handleGameUpdate(event) {
      const game =
        event.detail?.game ?? null;

      console.log(
        "🌐 AuthContext reçoit le jeu :",
        game?.name || "aucun jeu"
      );

      setCurrentGame(game);
    }

    window.addEventListener(
      "gamerlink-game-updated",
      handleGameUpdate
    );

    return () => {
      window.removeEventListener(
        "gamerlink-game-updated",
        handleGameUpdate
      );
    };
  }, [setCurrentGame]);

  // ==========================================================
  // CONTEXTE GLOBAL
  // ==========================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,

        login,
        register,
        logout,

        refreshUser,
        setUser,

        // 🎮 Jeu actuellement joué
        currentGame,
        setCurrentGame,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================================
// HOOK
// ==========================================================

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth doit être utilisé dans <AuthProvider>"
    );
  }

  return ctx;
}