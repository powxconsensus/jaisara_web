"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";

/**
 * The hero's secondary call to action.
 *
 * A client island inside an otherwise static page. The home page is
 * prerendered - it cannot know who is reading it - so a hardcoded "Free
 * account" invited a signed-in member to create the account they were already
 * using. The navbar already resolves this at runtime; this makes the hero
 * agree with it.
 *
 * While the session is still resolving it shows the signed-out label. That is
 * the safe default on a marketing page: nearly everyone who lands here is a
 * visitor, and the alternative - an empty slot until auth settles - moves the
 * two buttons beside it on every single load.
 */
export function HeroCta({ className, style }: { className: string; style: React.CSSProperties }) {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <Link
      href={signedIn ? "/dashboard" : "/signup"}
      className={className}
      style={style}
      prefetch={false}
    >
      {signedIn ? "Your wallet" : "Free account"}
    </Link>
  );
}
