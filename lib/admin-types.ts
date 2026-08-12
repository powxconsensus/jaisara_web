/**
 * Shapes the console reads back from the API.
 *
 * These mirror the `select` blocks in the Nest controllers rather than the
 * Prisma models - the API deliberately returns less than it stores, and typing
 * against the model would promise fields the wire never carries.
 */

export const ADMIN_PERMISSIONS = {
  platformView: "platform:view",
  platformManage: "platform:manage",
  productView: "product:view",
  productManage: "product:manage",
  couponView: "coupon:view",
  couponManage: "coupon:manage",

  importView: "import:view",
  importUpload: "import:upload",
  importCommit: "import:commit",
  orderView: "order:view",

  claimViewAll: "claim:view_all",
  claimApprove: "claim:approve",
  claimReject: "claim:reject",
  claimReassign: "claim:reassign",

  ledgerView: "ledger:view",
  ledgerAdjust: "ledger:adjust",
  withdrawalView: "withdrawal:view",
  withdrawalProcess: "withdrawal:process",

  configView: "config:view",
  configManage: "config:manage",
  tierManage: "tier:manage",
  rewardManage: "reward:manage",

  userView: "user:view",
  userManage: "user:manage",
  roleManage: "role:manage",

  marketingView: "marketing:view",
  marketingManage: "marketing:manage",
  marketingSend: "marketing:send",
  suppressionManage: "suppression:manage",

  postWrite: "post:write",
  postPublish: "post:publish",

  supportView: "support:view",
  supportReply: "support:reply",

  aiView: "ai:view",
  aiManage: "ai:manage",

  auditView: "audit:view",
  analyticsView: "analytics:view",
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

// ── Claims ───────────────────────────────────────────────────────────────────

export type ClaimStatus =
  | "DRAFT"
  /** Submitted, but the firm has not reported the order yet. */
  | "AWAITING_REPORT"
  /** Matched to an order and waiting for a reviewer. */
  | "MATCHED"
  | "APPROVED"
  | "REJECTED"
  /** Somebody already owns this order reference. */
  | "DUPLICATE"
  /** Two plausible claimants - a human decides. */
  | "DISPUTED";

/** The statuses `GET /admin/claims?status=` accepts. `DRAFT` is not one. */
export const CLAIM_QUERY_STATUSES = [
  "AWAITING_REPORT",
  "MATCHED",
  "APPROVED",
  "REJECTED",
  "DUPLICATE",
  "DISPUTED",
] as const;

export interface ClaimOrder {
  id: string;
  externalId: string;
  occurredAt: string;
  grossAmount: string;
  commissionAmountUsd: string;
  status: string;
  rawStatus?: string | null;
}

export interface ClaimSummary {
  id: string;
  claimedExternalId: string;
  claimedAmount?: string | null;
  claimedPurchaseAt?: string | null;
  claimedProductText?: string | null;
  status: ClaimStatus;
  source: string;
  matchStrategy?: string | null;
  matchConfidence?: number | null;
  proofStorageKey?: string | null;
  createdAt: string;
  user: { id: string; email: string; displayName?: string | null };
  platform: { slug: string; name: string };
  matchedOrder?: ClaimOrder | null;
}

export interface ClaimDetail extends Omit<ClaimSummary, "matchedOrder" | "user"> {
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  ipHash?: string | null;
  user: {
    id: string;
    email: string;
    displayName?: string | null;
    createdAt: string;
    clubTierKey?: string | null;
  };
  matchedOrder?: (ClaimOrder & Record<string, unknown>) | null;
  /**
   * The conversion stores the whole commission plus the split frozen onto it -
   * the per-party amounts live in the ledger, not here. Typing them as columns
   * meant the review panel rendered `undefined` for all three.
   */
  conversion?: {
    id: string;
    status: string;
    holdUntil?: string | null;
    commissionAmountUsd: string;
    commissionPoints: string;
    buyerPct: string;
    referrerPct: string;
    platformPct: string;
  } | null;
}

// ── Imports ──────────────────────────────────────────────────────────────────

export interface ImportAdapter {
  key: string;
  displayName: string;
  version: string;
  requiredColumns: string[];
}

export interface AffiliateAccount {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export type ImportStatus =
  | "UPLOADED"
  | "PARSING"
  | "PARSED"
  | "PREVIEWED"
  | "COMMITTING"
  | "COMMITTED"
  | "FAILED";

export interface ImportBatch {
  id: string;
  fileName: string;
  fileHash?: string;
  fileSize: number;
  adapterKey: string;
  adapterVersion?: string;
  status: ImportStatus;
  stats?: (ParseSummary & { diff?: ImportDiff }) | null;
  error?: string | null;
  createdAt: string;
  parsedAt?: string | null;
  committedAt?: string | null;
  /**
   * Whether the uploaded file itself was archived to storage.
   *
   * A boolean rather than the storage key: the key is an internal detail, and
   * the only legitimate way to reach the bytes is the signed link from
   * `GET /admin/imports/:id/file`.
   */
  archived?: boolean;
  uploadedByUserId?: string;
  committedByUserId?: string | null;
  platform: { id: string; name: string; slug: string };
  _count?: { rows: number };
}

/** What the parser found in the file. Describes the file, not the database. */
export interface ParseSummary {
  totalRows: number;
  sales: number;
  debits: number;
  adjustments: number;
  errors: number;
  productKeys: string[];
  statusWords: string[];
  dateRange: { from: string; to: string } | null;
  grossCommission: string;
}

/** What committing *would* change. Nothing here has happened yet. */
export interface ImportDiff {
  inserts: number;
  updates: number;
  unchanged: number;
  statusChanges: { externalId: string; from: string; to: string }[];
  clawbacks: number;
  skippedNonSales: number;
  unmappedProducts: string[];
  unmappedStatuses: string[];
  errors: string[];
}

export interface ImportPreview {
  batchId: string;
  summary: ParseSummary;
  diff: ImportDiff;
}

export interface ImportCommitResult {
  batchId?: string;
  inserted?: number;
  updated?: number;
  clawbacks?: number;
  rematched?: number;
  [key: string]: unknown;
}

export interface ImportRow {
  id: string;
  lineNo: number;
  raw: Record<string, unknown>;
  status?: string;
  errors?: string[];
}

// ── Catalogue ────────────────────────────────────────────────────────────────

export type PlatformStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface Platform {
  id: string;
  slug: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  adapterKey?: string | null;
  fulfillment: "REDIRECT" | "RESELL";
  status: PlatformStatus;
  supportsSubId: boolean;
  subIdParam?: string | null;
  trackedLinkTemplate?: string | null;
  exposesCustomerId: boolean;
  defaultCouponCode?: string | null;
  profitSplit?: string | null;
  payoutCadence?: string | null;
  tradingPlatforms: string[];
  createdAt?: string;
  statusMappings?: StatusMapping[];
  _count?: { products: number; coupons: number; orders: number };
}

export interface StatusMapping {
  rawStatus: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "PAID";
  isTerminal: boolean;
  note?: string | null;
}

export type ProductStatus = "ACTIVE" | "UNMAPPED" | "ARCHIVED";

export interface Product {
  id: string;
  platformId: string;
  name: string;
  family?: string | null;
  accountSize?: number | null;
  kind: string;
  status: ProductStatus;
  tradingPlatform?: string | null;
  listPrice?: string | null;
  currency: string;
  estCommissionRate?: string | null;
  isListed: boolean;
  aliases?: { rawKey: string }[];
  platform?: { id: string; slug: string; name: string };
  _count?: { orders: number };
}

export interface Coupon {
  id: string;
  platformId: string;
  affiliateAccountId: string;
  code: string;
  discountPct?: string | null;
  trackedLinkTemplate?: string | null;
  status: "ACTIVE" | "PAUSED" | "EXPIRED";
  startsAt?: string | null;
  endsAt?: string | null;
  platform?: { slug: string; name: string };
}

export interface PlatformOrder {
  id: string;
  externalId: string;
  occurredAt: string;
  occurredAtPrecision?: string;
  grossAmount?: string | null;
  commissionAmountUsd: string;
  currency: string;
  status: string;
  rawStatus?: string | null;
  rawProductKey?: string | null;
  subId?: string | null;
  externalCustomerId?: string | null;
  platform: { slug: string; name: string };
  product?: { name: string; kind: string } | null;
  conversion?: { id: string; status: string; source: string; userId: string } | null;
}

export interface OrderStat {
  platform: string;
  kind: string;
  status: string;
  orders: number;
  commissionUsd: string;
  grossUsd?: string | null;
}

// ── Money ────────────────────────────────────────────────────────────────────

export type WithdrawalStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export interface Withdrawal {
  id: string;
  status: WithdrawalStatus;
  method: "USDT" | "GIFT_CARD";
  points: string;
  feePoints: string;
  netPoints: string;
  grossAmountUsd: string;
  feeUsd: string;
  netAmountUsd: string;
  autoPayEligible: boolean;
  autoPayReason: string;
  requestedAt: string;
  processedAt?: string | null;
  externalTxId?: string | null;
  failureReason?: string | null;
  user: { id: string; email: string; displayName?: string | null; kycStatus: string };
  payoutAddress?: { chain: string; address: string; usableFrom?: string | null } | null;
  rewardItem?: { name: string; brand?: string | null } | null;
}

export interface CommissionRule {
  id: string;
  scope: "GLOBAL" | "PLATFORM" | "PRODUCT" | "COUPON";
  scopeId?: string | null;
  tierKey?: string | null;
  buyerPct: string;
  referrerPct: string;
  platformPct: string;
  noReferrerPolicy: "TO_PLATFORM" | "TO_BUYER";
  holdDays: number;
  holdAnchor: "PURCHASE_DATE" | "APPROVAL_DATE";
  effectiveFrom: string;
  /**
   * True when `effectiveFrom` is the sentinel the seeded default carries
   * rather than a date somebody chose. The API decides this, so the boundary
   * is defined once - printing the sentinel as a date showed a start date the
   * business did not exist on.
   */
  alwaysApplied?: boolean;
  effectiveTo?: string | null;
  note?: string | null;
}

export interface ClubTier {
  key: string;
  name: string;
  rank: number;
  minQualifiedReferrals: number;
  minLifetimeVolumeUsd: string;
  buyerPct?: string | null;
  referrerPct?: string | null;
  platformPct?: string | null;
  color?: string | null;
  description?: string | null;
  _count?: { users: number };
}

export interface Setting {
  key: string;
  value: unknown;
  description?: string | null;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ── Marketing ────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "SENT"
  | "CANCELLED"
  | "FAILED";

export interface CampaignSummary {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  scheduledFor?: string | null;
  startedAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  stats?: Record<string, number> | null;
  _count?: { deliveries: number };
}

export interface CampaignDetail extends CampaignSummary {
  bodyHtml: string;
  bodyText: string;
  /**
   * The studio's block document, if this campaign was written with it.
   * `unknown` on purpose - the API stores it verbatim without interpreting it,
   * and `isEmailDesign` is what narrows it before use.
   */
  design?: unknown;
  audience: CampaignAudience;
  updatedAt: string;
  error?: string | null;
}

export interface CampaignAudience {
  testEmails?: string[];
  tierKeys?: string[];
  hasConverted?: boolean;
  joinedAfter?: string;
  joinedBefore?: string;
  countryCodes?: string[];
}

export interface CampaignStats {
  total: number;
  sent: number;
  queued: number;
  bounced: number;
  complained: number;
  failed: number;
  skipped: number;
  opened?: number;
  clicked?: number;
  [key: string]: number | undefined;
}

export interface CampaignDelivery {
  email: string;
  status: "QUEUED" | "SENT" | "BOUNCED" | "COMPLAINED" | "FAILED" | "SKIPPED";
  skipReason?: string | null;
  error?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
}

export interface SubscriberSummary {
  activeMembers: number;
  optedIn: number;
  reachable: number;
  suppressed: number;
}

export interface Suppression {
  email: string;
  reason: "HARD_BOUNCE" | "COMPLAINT" | "UNSUBSCRIBED" | "MANUAL";
  source?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface AudiencePreview {
  audience: string;
  recipients: number;
  breakdown: Record<string, number>;
}

// ── Content ──────────────────────────────────────────────────────────────────

export type PostStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body: string;
  coverUrl?: string | null;
  /** Journal post or help article - the same object, two audiences. */
  kind: "JOURNAL" | "HELP";
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  status: PostStatus;
  publishedAt?: string | null;
  updatedAt: string;
  author: { id: string; displayName?: string | null };
}

// ── People ───────────────────────────────────────────────────────────────────

export type UserStatus = "ACTIVE" | "PENDING_DELETION" | "SUSPENDED" | "ANONYMIZED";

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  status: UserStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  deletionScheduledFor?: string | null;
  referralCode?: string | null;
  clubTierKey?: string | null;
  clubScore?: number | null;
  roles: { roleKey: string }[];
  wallet?: {
    availablePoints: string;
    pendingPoints: string;
    lifetimeEarnedPoints: string;
  } | null;
  _count: { claims: number; conversions: number; referrals: number };
}

export interface AdminUserDetail extends Omit<AdminUser, "roles" | "_count"> {
  kycStatus: string;
  suspendedAt?: string | null;
  suspendedNote?: string | null;
  deletionRequestedAt?: string | null;
  subIdToken?: string | null;
  referredBy?: { id: string; displayName?: string | null; referralCode: string } | null;
  roles: { roleKey: string; grantedAt: string }[];
  externalIdentities: { platformId: string; kind: string; value: string; verifiedAt?: string | null }[];
  _count: { claims: number; conversions: number; referrals: number; withdrawals: number };
}

export interface RoleCatalogItem {
  key: string;
  rank: number;
  description: string;
  permissions: { key: string; group: string; description: string }[];
}

/** Roles the console offers to grant. `owner` is never in this list. */
export const ASSIGNABLE_ROLES = ["admin", "admin_edit", "admin_view", "author"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// ── AI providers ─────────────────────────────────────────────────────────────

/**
 * A provider as the console is allowed to see it.
 *
 * There is no field here from which a key could be reconstructed, and that is
 * deliberate rather than incidental: the API's response type is a different
 * shape from its database row, so a `select` gaining `ciphertext` cannot leak
 * one by accident. `tail` is four characters - enough to match a row against
 * the provider's own dashboard, useless to anyone else.
 */
export interface AiProviderKeyView {
  id: string;
  label: string;
  tail: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface AiProviderView {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  chatModel: string;
  visionModel: string;
  priority: number;
  enabled: boolean;
  chatRequestOptions?: Record<string, unknown> | null;
  visionRequestOptions?: Record<string, unknown> | null;
  visionMaxTokens?: number | null;
  lastCheckedAt?: string | null;
  lastCheckOk?: boolean | null;
  lastCheckNote?: string | null;
  keys: AiProviderKeyView[];
}

export interface AiConfigOverview {
  providers: AiProviderView[];
  /** Which list the API is serving from right now, not which one exists. */
  activeSource: "database" | "environment" | "none";
  environmentProviders: string[];
  /** False when AI_KEY_ENCRYPTION_KEY is unset - no key can be stored. */
  canStoreKeys: boolean;
  warnings: string[];
}

export interface AiCheckStep {
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
}

export interface AiTestResult {
  chat: AiCheckStep;
  vision: AiCheckStep;
}
