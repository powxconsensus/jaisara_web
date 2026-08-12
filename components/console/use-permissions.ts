"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/auth-context";
import type { AdminPermission } from "@/lib/admin-types";

export interface Access {
  /** True when the signed-in account holds every permission listed. */
  can: (...permissions: AdminPermission[]) => boolean;
  /** True when it holds at least one. */
  canAny: (...permissions: AdminPermission[]) => boolean;
  permissions: Set<string>;
  roles: string[];
  email?: string;
  userId?: string;
}

/**
 * What the signed-in account may do.
 *
 * This decides what to *render*. It is not the check that protects anything -
 * every one of these permissions is enforced again by the API on each request,
 * so a tampered client gets a 403 rather than an action.
 */
export function useAccess(): Access {
  const { user } = useAuth();

  return useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      permissions,
      roles: user?.roles ?? [],
      email: user?.email,
      userId: user?.id,
      can: (...required: AdminPermission[]) =>
        required.every((permission) => permissions.has(permission)),
      canAny: (...required: AdminPermission[]) =>
        required.some((permission) => permissions.has(permission)),
    };
  }, [user]);
}
