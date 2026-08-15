/**
 * Money & figure formatting. All figures render with `tabular-nums`
 * (see `[data-count]` in globals.css) so counts don't jitter (handoff §1.4).
 */

/** `$1,234.50` - two decimals, thousands separators. */
export function money(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A signed money delta, e.g. `+$18.06` or `−$25.80` (true minus glyph). */
export function signedMoney(value: number): string {
  if (value < 0) return `−${money(Math.abs(value))}`;
  return `+${money(value)}`;
}

/**
 * `$299`, `$1,146`, `$236.98` - cents only when there are cents.
 *
 * For prices in dense columns, where a trailing `.00` costs width and says
 * nothing. It never rounds: a firm charging $99.50 shown as `$100` is a
 * misquoted price, and the width saved is not worth being wrong about what
 * somebody is about to pay.
 */
export function moneyCompact(value: number): string {
  return Number.isInteger(value) ? `$${value.toLocaleString("en-US")}` : money(value);
}

/** `$38 – $149`, or a single figure when both ends agree. */
export function moneyRange(min: number, max: number): string {
  return min === max ? moneyCompact(min) : `${moneyCompact(min)} – ${moneyCompact(max)}`;
}

/**
 * A spread stated as whole dollars: `$5 – $142`.
 *
 * Rounds outward - down at the bottom, up at the top - so the band is a true
 * bound rather than a rounded one: nothing inside it is ever below the low
 * figure or above the high figure. Cents on a range are noise anyway, since
 * neither end is a price anybody pays.
 */
export function moneyBand(min: number, max: number): string {
  const low = Math.floor(min);
  const high = Math.ceil(max);
  return low === high ? `$${low.toLocaleString("en-US")}` : `$${low.toLocaleString("en-US")} – $${high.toLocaleString("en-US")}`;
}

/** `1 firm`, `12 firms` - the count and its noun, agreeing. */
export function plural(count: number, noun: string, plural = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : plural}`;
}

/** `14%` */
export function percent(value: number): string {
  return `${value}%`;
}

/** `10 – 18%`, or `13%` when the spread is a point. */
export function percentRange(min: number, max: number): string {
  return min === max ? `${min}%` : `${min} – ${max}%`;
}

/**
 * The cashback maths for a single challenge, shared by the receipt, the
 * estimator and the split.
 *
 * Cashback comes off `youPay`, not off `list`. It is a share of the commission
 * the firm pays us, and a firm pays commission on what it actually charged - so
 * quoting it against the list price over-promises by exactly the discount. It
 * was invisible while every coupon carried 0% off and becomes a real
 * over-quote the day one is published, which is why it is stated here rather
 * than left as the prototype had it.
 */
export function challengeMath(list: number, discountPct: number, cashbackPct: number) {
  const discount = (list * discountPct) / 100;
  const youPay = list - discount;
  const cashback = (youPay * cashbackPct) / 100;
  return { list, discount, youPay, cashback };
}
