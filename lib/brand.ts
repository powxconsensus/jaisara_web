/**
 * The one public coupon code.
 *
 * There is a single code, it is the brand name, and it is the same at every
 * firm - which is the whole reason the header can show it as a pill rather than
 * making somebody look it up per firm.
 *
 * It lived in `nav.ts` as `HEADER_COUPON`, which is where the header found it
 * and nowhere else looked. The fallback fixtures invented their own instead -
 * `JAISARA20`, `JAISARA15`, `JSR-ALPHA` and twenty more - so a fresh install
 * with no catalogue rendered a different code on every row while the header
 * pill beside them showed `JAISARA`. Whichever one a member copied, one of the
 * two was wrong, and a wrong coupon at checkout is an untracked purchase and no
 * cashback.
 *
 * A firm that genuinely issues its own code carries it on its `Coupon` row in
 * the database. This is only the fallback, and there is exactly one.
 */
export const BRAND_COUPON = "JAISARA";
