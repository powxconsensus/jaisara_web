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
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/auth-types";
import { SESSION_EXPIRED_EVENT } from "@/lib/api-fetch";
import { clearResourceCache } from "@/lib/resource-cache";

type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  refresh: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * A session the server already resolved, handed over by `SessionSeed`.
 *
 * A module variable rather than a prop, because the provider lives in the root
 * layout - which must stay static-friendly - while the read happens in the
 * dashboard and console layouts, which are dynamic anyway. React renders parent
 * before child but runs child effects first, so a child seeding during *render*
 * always lands before this provider's mount effect runs, which is what lets the
 * fetch be skipped rather than merely beaten.
 */
let seededUser: AuthUser | null = null;
const seedListeners = new Set<() => void>();

export function seedSessionUser(user: AuthUser | null): void {
  if (!user || seededUser) return;
  seededUser = user;
  for (const listener of seedListeners) listener();
}

/**
 * Read through `useSyncExternalStore` rather than copied into state.
 *
 * The provider renders before the child that seeds, so a lazy initialiser
 * would always miss it, and assigning in an effect is setState-in-effect -
 * which React's own lint rule forbids and which would paint "loading" first
 * anyway, reintroducing the flash this removes. Subscribing means the seed is
 * simply the value, from the render it arrives in.
 */
function subscribeToSeed(onChange: () => void): () => void {
  seedListeners.add(onChange);
  return () => {
    seedListeners.delete(onChange);
  };
}

const readSeed = () => seededUser;
/** Always null on the server: the seed is handed over during client render. */
const readSeedOnServer = () => null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const seeded = useSyncExternalStore(subscribeToSeed, readSeed, readSeedOnServer);
  const [fetched, setFetched] = useState<AuthUser | null>(null);
  const [settled, setSettled] = useState(false);

  // A later `refresh()` wins over the seed - it is the fresher read, and after
  // a profile edit the seeded copy is stale.
  const user = fetched ?? seeded;

  /**
   * Derived, not stored.
   *
   * Holding it in state meant the seeded path had to `setStatus` from an
   * effect - which React's lint rule forbids, and which would paint "loading"
   * for one frame before correcting itself. That frame is the flash this whole
   * change exists to remove. Derived, a seeded user is authenticated from the
   * first render, and "guest" is reached only by actually settling on nobody.
   */
  const status: AuthStatus = user ? "authenticated" : settled ? "guest" : "loading";
  const [sessionVersion, setSessionVersion] = useState(0);
  const accountDataMounted = useRef(false);

  const clearAccountState = useCallback(() => {
    // Clears the seed as well, so a signed-out session cannot fall back to the
    // user the server rendered with - and empties the response cache, which
    // holds balances, claims and other members' details. None of that may
    // outlive the session that authorised it.
    seededUser = null;
    clearResourceCache();
    setFetched(null);
    setSettled(true);
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
      setFetched(nextUser);
      setSettled(true);
      return nextUser;
    } catch {
      clearAccountState();
      return null;
    }
  }, [clearAccountState]);

  useEffect(() => {
    // Already resolved on the server, so there is nothing to ask for. Skipping
    // this is the whole point: it is the request everything else waited behind.
    // Nothing to set either - `status` derives from the seeded value, so it is
    // already authenticated by the time this runs.
    if (seeded) {
      accountDataMounted.current = true;
      return;
    }

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
        setFetched(nextUser);
        setSettled(true);
      })
      .catch(() => {
        if (!active) return;
        clearAccountState();
      });

    return () => {
      active = false;
    };
  }, [clearAccountState, seeded]);

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
