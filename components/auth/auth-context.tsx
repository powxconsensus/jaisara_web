"use client";

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/auth-types";
import { SESSION_EXPIRED_EVENT } from "@/lib/api-fetch";

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
  const [sessionVersion, setSessionVersion] = useState(0);
  const accountDataMounted = useRef(false);

  const clearAccountState = useCallback(() => {
    setUser(null);
    setStatus("guest");
    // Remount descendants so component-local account data (claim history,
    // club standing, console rows, etc.) cannot survive a session boundary.
    if (accountDataMounted.current) {
      accountDataMounted.current = false;
      setSessionVersion((version) => version + 1);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        clearAccountState();
        return null;
      }

      const nextUser = (await response.json()) as AuthUser;
      accountDataMounted.current = true;
      setUser(nextUser);
      setStatus("authenticated");
      return nextUser;
    } catch {
      clearAccountState();
      return null;
    }
  }, [clearAccountState]);

  useEffect(() => {
    let active = true;

    void fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          clearAccountState();
          return;
        }
        const nextUser = (await response.json()) as AuthUser;
        if (!active) return;
        accountDataMounted.current = true;
        setUser(nextUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        clearAccountState();
      });

    return () => {
      active = false;
    };
  }, [clearAccountState]);

  useEffect(() => {
    const expire = () => clearAccountState();
    const syncSignOut = (event: StorageEvent) => {
      if (event.key === "jaisara:sign-out") clearAccountState();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    window.addEventListener("storage", syncSignOut);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
      window.removeEventListener("storage", syncSignOut);
    };
  }, [clearAccountState]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      clearAccountState();
      try {
        localStorage.setItem("jaisara:sign-out", String(Date.now()));
      } catch {
        // Storage can be unavailable in hardened/private browser modes.
      }
    }
  }, [clearAccountState]);

  const value = useMemo(
    () => ({ status, user, refresh, signOut }),
    [refresh, signOut, status, user],
  );

  return (
    <AuthContext.Provider value={value}>
      <Fragment key={sessionVersion}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within <AuthProvider>");
  return context;
}
