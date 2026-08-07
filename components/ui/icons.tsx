import type { SVGProps } from "react";

/**
 * Small line-icon set (currentColor, 1.6 stroke). Directional arrows in the
 * design are unicode glyphs (↗ ↓); these cover the UI affordances.
 */

function Icon({ children, size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 6.5" />
  </Icon>
);

export const CopyIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Icon>
);

/**
 * Sign out: door on the left, arrow leaving to the right.
 *
 * The first version had the arrow pointing back into the frame, which is the
 * conventional glyph for signing *in* — the direction is the whole meaning of
 * this icon, so it has to leave.
 */
export const SignOutIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2" />
    <path d="m14 7 5 5-5 5" />
    <path d="M19 12H9" />
  </Icon>
);

export const LockIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Icon>
);
