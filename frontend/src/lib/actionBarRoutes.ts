/**
 * Screen 02b — the routes that already pin an action bar to the bottom of the
 * screen. On these the assistant launcher moves into the header, because a
 * floating button plus an action bar plus the tab bar is three layers of fixed
 * chrome and the launcher lands on top of the primary action.
 *
 * One list, imported by both the widget and the header, so the two can never
 * disagree about which screens those are.
 */
const ACTION_BAR_PREFIXES = ["/cart", "/checkout", "/book"];

export function hasBottomActionBar(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // A product detail page (/products/<slug>) carries the buy bar; the listing
  // at /products does not.
  if (/^\/products\/[^/]+/.test(pathname)) return true;
  return ACTION_BAR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
