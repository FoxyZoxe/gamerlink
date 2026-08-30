import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.me();
        setUser(user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { token, user } = await api.login({ identifier, password });
    setToken(token);
    setUser(user);
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user } = await api.register(payload);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // même si l'appel échoue, on déconnecte localement
    }
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await api.me();
    setUser(user);
    return user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
