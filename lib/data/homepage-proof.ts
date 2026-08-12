import { apiRequest } from "@/lib/auth-server";

const REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 5 : 60;
const FETCH_TIMEOUT_MS = 8_000;

export interface HomepageFeedback {
  id: string;
  authorName: string;
  authorHandle?: string | null;
  quote: string;
  sourceUrl: string;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  status: "PUBLISHED";
  sortOrder: number;
  createdAt: string;
}

export interface HomepageProof {
  sponsorSlugs: string[];
  feedback: HomepageFeedback[];
}

const EMPTY: HomepageProof = { sponsorSlugs: [], feedback: [] };

/** Public proof is curated by an admin; network failure simply hides it. */
export async function fetchHomepageProof(): Promise<HomepageProof> {
  try {
    const response = await apiRequest("/homepage/social-proof", {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    } as RequestInit);

    if (!response.ok) return EMPTY;
    const payload = (await response.json()) as Partial<HomepageProof>;
    return {
      sponsorSlugs: Array.isArray(payload.sponsorSlugs) ? payload.sponsorSlugs : [],
      feedback: Array.isArray(payload.feedback) ? payload.feedback : [],
    };
  } catch {
    return EMPTY;
  }
}
