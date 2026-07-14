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
  logout as logoutRequest,
  PUBLIC_IDENTITY,
  redeemInvite,
  type PanelIdentity,
} from '@/lib/authApi';

interface PanelAuthValue {
  identity: PanelIdentity;
  /** true, пока не получен первый ответ /me (состояние loading — с первого коммита). */
  loading: boolean;
  /** Человеческий текст последней ошибки входа; null = ошибки нет. */
  error: string | null;
  loginWithInvite: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PanelAuthContext = createContext<PanelAuthValue | null>(null);

export function PanelAuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<PanelIdentity>(PUBLIC_IDENTITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (!cancelled) setIdentity(me);
      })
      .catch(() => {
        if (!cancelled) setIdentity(PUBLIC_IDENTITY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithInvite = useCallback(async (code: string) => {
    setError(null);
    try {
      setIdentity(await redeemInvite(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось войти.');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setIdentity(PUBLIC_IDENTITY);
    }
  }, []);

  const value = useMemo(
    () => ({ identity, loading, error, loginWithInvite, logout }),
    [identity, loading, error, loginWithInvite, logout],
  );

  return <PanelAuthContext.Provider value={value}>{children}</PanelAuthContext.Provider>;
}

export function usePanelAuth(): PanelAuthValue {
  const ctx = useContext(PanelAuthContext);
  if (!ctx) throw new Error('usePanelAuth: PanelAuthProvider отсутствует выше по дереву');
  return ctx;
}
