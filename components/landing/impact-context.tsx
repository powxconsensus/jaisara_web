"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

/**
 * Connects the receipt deck to the ground it lands on.
 *
 * The two live in different branches of the hero — the deck sits inside the
 * right-hand column, the ground spans the whole section behind everything — so
 * they cannot share a ref by ordinary means. Rather than have the ground reach
 * into the DOM for the card, the deck registers it here and announces its
 * landings; the ground decides what a landing looks like.
 */

/**
 * A landing. There is exactly one per cycle: the sheet rocks after it hits,
 * but the ledger breaks once. The prototype fired a second, softer impact on
 * the rebound; because every impact cancels the one before it, that second
 * call truncated the first fracture and replayed it, which read as two
 * separate breaks instead of one landing. Do not add it back.
 */
export interface ImpactEvent {
  /** Paid claims land harder than pending ones, so the two states differ. */
  hot: boolean;
}

type Listener = (event: ImpactEvent) => void;

interface ImpactContextValue {
  /** The deck hands over its card on mount, and drops it on unmount. */
  setTarget: (element: HTMLElement | null) => void;
  /** The card's live rect — where the next strike will land. */
  measureTarget: () => DOMRect | null;
  emit: (event: ImpactEvent) => void;
  subscribe: (listener: Listener) => () => void;
}

const ImpactContext = createContext<ImpactContextValue | null>(null);

export function ImpactProvider({ children }: { children: ReactNode }) {
  const target = useRef<HTMLElement | null>(null);
  const listeners = useRef(new Set<Listener>());

  // Exposed only through the closures below: a ref handed out through context
  // would be mutated from another component, which React 19 rightly rejects.
  const value = useMemo<ImpactContextValue>(
    () => ({
      setTarget: (element) => {
        target.current = element;
      },
      measureTarget: () => target.current?.getBoundingClientRect() ?? null,
      emit: (event) => {
        for (const listener of listeners.current) listener(event);
      },
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
    }),
    [],
  );

  return <ImpactContext.Provider value={value}>{children}</ImpactContext.Provider>;
}

/** Null outside the hero, so the deck can render anywhere without a ground. */
export function useImpact(): ImpactContextValue | null {
  return useContext(ImpactContext);
}
