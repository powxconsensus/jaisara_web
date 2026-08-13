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
 * conventional glyph for signing *in* - the direction is the whole meaning of
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

/* ---- Journey icons ------------------------------------------------------- */
/* The five How-it-works medallions. Drawn at 24 like the rest of the set but
   used at 22-26, so they carry the same 1.6 stroke as the UI affordances and
   do not read as a second icon family. */

export const TagIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="M4 11.2V5.5A1.5 1.5 0 0 1 5.5 4h5.7a2 2 0 0 1 1.42.59l7 7a2 2 0 0 1 0 2.82l-5.3 5.3a2 2 0 0 1-2.82 0l-7-7A2 2 0 0 1 4 11.2Z" />
    <path d="M8.5 8.5h.01" />
  </Icon>
);

export const CardIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19" />
    <path d="M6.5 14.5h3.5" />
  </Icon>
);

export const ReceiptIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="M5 3.5h14v17l-2.33-1.6-2.34 1.6L12 18.9l-2.33 1.6-2.34-1.6L5 20.5Z" />
    <path d="M9 8.5h6" />
    <path d="M9 12.5h6" />
  </Icon>
);

export const WalletIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5H18a2 2 0 0 1 2 2" />
    <rect x="3.5" y="7.5" width="17" height="11.5" rx="2.5" />
    <path d="M16 13.2h.01" />
  </Icon>
);

export const ShareIcon = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <Icon {...p}>
    <circle cx="17.5" cy="6" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="17.5" cy="18" r="2.6" />
    <path d="m8.4 10.8 6.7-3.5" />
    <path d="m8.4 13.2 6.7 3.5" />
  </Icon>
);
