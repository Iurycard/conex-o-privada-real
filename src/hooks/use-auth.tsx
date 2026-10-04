import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authRequest } from "@/lib/d1-client";

export type AuthUser = {
  id: string;
  email: string;
  app_metadata: { role: string };
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await authRequest<AuthUser>("/api/auth/session");
    setUser(data);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    await authRequest<never>("/api/auth/logout", {});
    setUser(null);
    window.dispatchEvent(new Event("cp:auth-changed"));
  }, []);

  useEffect(() => {
    void refresh();
    const onAuthChange = () => void refresh();
    window.addEventListener("cp:auth-changed", onAuthChange);
    window.addEventListener("focus", onAuthChange);
    return () => {
      window.removeEventListener("cp:auth-changed", onAuthChange);
      window.removeEventListener("focus", onAuthChange);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      signOut,
    }),
    [user, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
