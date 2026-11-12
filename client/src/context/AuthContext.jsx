import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearApiCache, extractError } from '../services/api';

const AuthContext = createContext();

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('facehr_user') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (identifier, password, role) => {
    clearApiCache();
    const { data } = await api.post('/auth/login', { identifier, password, role });
    localStorage.setItem('facehr_token', data.token);
    localStorage.setItem('facehr_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('facehr_token');
    localStorage.removeItem('facehr_user');
    clearApiCache();
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('facehr_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      return null;
    }
  }, []);

  // Restore session on first load
  useEffect(() => {
    const token = localStorage.getItem('facehr_token');
    if (!token) {
      setLoading(false);
      return;
    }
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  // Keep the free-tier API warm while a tab is open. Render sleeps after ~15
  // minutes of inactivity; a light health ping avoids most cold starts.
  useEffect(() => {
    if (!user) return undefined;
    const ping = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      api.get('/health').catch(() => {});
    };
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      isEmployee: user?.role === 'employee',
      login,
      logout,
      refreshMe,
      updateUser: (patch) => {
        setUser((prev) => ({ ...prev, ...patch }));
      },
      errorMessage: extractError,
    }),
    [user, loading, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);