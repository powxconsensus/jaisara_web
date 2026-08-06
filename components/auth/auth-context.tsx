"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/auth-types";

type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  refresh: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        setUser(null);
        setStatus("guest");
        return null;
      }

      const nextUser = (await response.json()) as AuthUser;
      setUser(nextUser);
      setStatus("authenticated");
      return nextUser;
    } catch {
      setUser(null);
      setStatus("guest");
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    void fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setUser(null);
          setStatus("guest");
          return;
        }
        const nextUser = (await response.json()) as AuthUser;
        if (!active) return;
        setUser(nextUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus("guest");
      });

    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, refresh, signOut }),
    [refresh, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within <AuthProvider>");
  return context;
}
