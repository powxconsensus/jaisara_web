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

/** `14%` */
export function percent(value: number): string {
  return `${value}%`;
}

/**
 * The cashback maths for a single challenge, shared by the receipt, the
 * estimator and the split. Derived exactly as the prototype does (README §2).
 */
export function challengeMath(list: number, discountPct: number, cashbackPct: number) {
  const discount = (list * discountPct) / 100;
  const youPay = list - discount;
  const cashback = (list * cashbackPct) / 100;
  return { list, discount, youPay, cashback };
}
