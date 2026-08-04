"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ToastKind = "success" | "info" | "warning" | "danger";

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const dotColor: Record<ToastKind, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** One toast at a time, bottom-centre, auto-dismissing after 2.8s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ id: Date.now(), message, kind });
    timer.current = setTimeout(() => setCurrent(null), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4"
      >
        {current && (
          <div
            key={current.id}
            role="status"
            className="flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-[12px] border border-hair bg-surface px-5 py-3.5 shadow-card [animation:jsToast_.28s_cubic-bezier(.2,.8,.2,1)_both]"
          >
            <span className={cn("size-[7px] flex-none rounded-[2px]", dotColor[current.kind])} />
            <span className="truncate text-[13.5px] font-medium">{current.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
