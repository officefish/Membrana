import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchMe,
  getStoredToken,
  loginRequest,
  logoutRequest,
  setStoredToken,
  type AuthUser,
} from '@/api/auth';
import { resetCabinetMediaSession } from '@/lib/cabinetMediaLibrary';
import { getCabinetNodeRealtimeClient } from '@/lib/cabinetNodeRealtimeClient';
import { resetCabinetRuntimeStore } from '@/lib/cabinetNodeRuntimeStore';
import { disposeSamplePlayback } from '@membrana/sample-playback-service';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    void fetchMe(token)
      .then((u) => setUser(u))
      .catch(() => setStoredToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginName: string, password: string) => {
    const result = await loginRequest(loginName, password);
    setStoredToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    const token = getStoredToken();
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        /* session may already be invalid */
      }
    }
    setStoredToken(null);
    setUser(null);
    // CX2: жизненный цикл realtime-сокета принадлежит сессии кабинета —
    // разделы больше не рвут общий синглтон, закрываем его здесь.
    getCabinetNodeRealtimeClient().disconnect();
    // CX6: runtime-состояние (presence/захваты/сценарии) не переживает сессию.
    resetCabinetRuntimeStore();
    resetCabinetMediaSession();
    void disposeSamplePlayback();
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
