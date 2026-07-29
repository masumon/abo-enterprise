# ABO Enterprise — Production UX / UI & Product-Behaviour Audit

**Method.** Static read of the current `frontend/src` implementation only. Route discovery from `app/**/page.tsx`, then only the files that render or drive each route were opened. Every finding cites the file it came from. Nothing is inferred from what "most sites" do; where a thing does not exist it is marked **Not Implemented**.

**Routes audited (40 public).** `/` · `/about` · `/blog` · `/blog/[slug]` · `/book` · `/booking-success` · `/career` · `/cart` · `/checkout` · `/compare` · `/contact` · `/dashboard` · `/faq` · `/forgot-password` · `/gallery` · `/legal/{cookies,privacy,refund,terms}` · `/login` · `/order-success` · `/orders` · `/orders/[orderNumber]` · `/payment/callback` · `/products` · `/products/[slug]` · `/profile` · `/profile/{addresses,invoices,settings,wishlist}` · `/projects` · `/projects/[slug]` · `/register` · `/search` · `/services` · `/services/[...segments]` · `/shipping` · `/testimonials` · `/track`.

Severity: **Critical** (blocks a task or loses money/data) · **High** (materially hurts conversion or trust) · **Medium** (friction) · **Low** (polish).

---

## A. Cross-cutting (applies to most pages)

### A1. No global route-transition / loading indicator — Medium
- **Location / evidence.** Individual pages fetch client-side (`cart`, `orders`, `search`, `book`) and show their own spinners, but there is no top-level navigation progress bar. On the free-tier backend (cold starts noted in `products/page.tsx` with a 55 s timeout) a click can sit for seconds with no feedback.
- **User impact.** On a slow first byte the user taps a nav item and nothing visibly happens; some will tap again.
- **Business impact.** Perceived slowness, repeat taps, bounce.
- **Recommended.** A single app-level navigation indicator (route change → thin top bar).
- **UX benefit.** Every navigation feels acknowledged, independent of backend latency.

### A2. Language is client-only; first paint can flash the wrong language — Medium
- **Evidence.** Every page reads `useLanguageStore()` (`lang === "bn" ? … : …`) in a client component. Language is not in the URL or SSR. `metadata` is authored in mixed languages (`app/page.tsx` title is `getBrandFullTitle("bn")` while descriptions are English).
- **Impact.** SSR HTML and the hydrated language can differ for a returning BN user (brief flash); search engines see one fixed language per page regardless of the toggle.
- **Business.** Minor CLS/flash; bilingual SEO is not fully realised (one canonical, one language in metadata).
- **Recommended.** Persist language earlier (cookie read in the server layer) or accept the single-language metadata as intentional and make it consistent.

### A3. `formatPrice` / date locale consistency — Low
- **Evidence.** Prices via `formatPrice` throughout; dates use `toLocaleDateString("en-GB")` in `orders/page.tsx` but `"en-BD"` in the admin booking modal and `"bn-BD"` elsewhere. Public order dates render `en-GB` even in Bengali mode.
- **Impact.** A Bengali user sees Bengali everything except the order date.
- **Recommended.** Route dates through one locale helper keyed on `lang`.

### A4. Accessibility baseline is good but uneven — Medium
- **Good, confirmed.** Buttons carry `aria-label`s (cart qty, wishlist, compare, social); `role="alert"`/`role="status"` on cart stock and search cache banners; skeletons use `aria-busy`; icons are `aria-hidden`.
- **Gaps.** The `/search` page has **no on-page search input** — it is results-only, driven by `?q=` (`app/search/page.tsx` has zero `<input>`/`<form>`). A user who lands on `/search` or clears the box on the 404 page cannot refine the query without going back to the navbar. Iframe-heavy gallery/project pages rely on provider a11y.
- **Recommended.** Add a search input to the `/search` header so the results page is self-contained.

---

## B. Homepage `/`

**Purpose / goal.** Route the visitor to one of three businesses (store, services, software) and build trust. **Business goal.** Discovery + lead capture.

- **Structure (evidence, `app/page.tsx`).** `Hero → QuickCategories → TrustBadges → EntryPoints → Stats → ServicesOverview → FeaturedProducts → Portfolio → ClientLogos → WhyChooseUs → CustomerReviews → FAQ → LeadCapture → ContactSection`. All below-the-fold sections are `next/dynamic` with a `SectionSkeleton` — good for TTI.
- **Strength.** Rich, valid structured data (`Organization`, `LocalBusiness`, `WebSite` + SearchAction). SEO/local-pack foundation is strong.

**Findings**

- **B1. Fourteen stacked full-width sections — High (cognitive load).** The page is a very long single column of 14 sections. There is no in-page anchor nav on mobile beyond `QuickCategories`. **Impact:** the three distinct businesses compete; a store-only visitor scrolls through services, portfolio, client logos, reviews, FAQ, lead form and contact before the page ends. **Recommend:** confirm section order earns its length (e.g. is `ClientLogos` + `Portfolio` + `Testimonials`-equivalent all needed above FAQ?). Not a defect — a prioritisation review.
- **B2. Hero promo relies on admin content; empty state already handled.** Confirmed the slider falls back to a single media and then to nothing (`PromoSlider` + `Hero.tsx`). No blank-block risk after the recent fixes. **No action.**
- **B3. `SectionSkeleton` is a bare pulsing block — Low.** Every lazy section shows the same generic grey pulse, so the page height jumps as each resolves. Acceptable, but shaped skeletons would reduce layout shift.

---

## C. Products listing `/products`

**Evidence:** `app/products/page.tsx` + `ProductsPageShell` → `ProductsClient.tsx`. SSR fetches taxonomy + first 20 products with retry and a 55 s timeout; legacy string categories kept as fallback.

- **C1. Fetch failure is handled correctly — positive (was flagged, now resolved).** On the server, `fetchProducts` returns `{ products: [], total: 0 }` on failure, but the client (`ProductsClient.tsx:69,138,224-231`) detects the empty initial payload (`needsApiRefresh`) and re-fetches on mount. `load()` then distinguishes three outcomes explicitly: a **cache fallback** (shows cached products with a demo banner), an **error state** with a *Retry* button (`ProductsClient.tsx:364-369`, "Server may be starting — please retry"), and a **distinct empty state** ("No products found", `ProductsClient.tsx:370-373`). A cold start therefore reads as "retryable error," not "empty store." **No action** — parity with services confirmed.
- **C2. On-page controls are complete — positive.** The client has its own search input (`ProductsClient.tsx:262-269`), category + cascading sub-category chips from live taxonomy, sort, grid/list toggle, and pagination *or* infinite scroll behind the `feature_infinite_scroll` flag (`ProductsClient.tsx:233-247,390-396`). Large catalogues are not truncated — the shell pages beyond 20.
- **C3. Search input here vs. absent on `/search` — Medium (consistency).** `/products` has a real, debounced search box, yet the dedicated `/search` results page has none (see I1). Two different search surfaces with inconsistent affordances. **Recommend:** reuse this input pattern on `/search`.

---

## D. Product detail `/products/[slug]`

**Evidence:** `app/products/[slug]/page.tsx` + `ProductDetailShell`; `ProductCard.tsx` for the card actions reused in related lists.

- **D1. `aggregateRating` is fabricated — High (trust / SEO risk).** `buildJsonLd` emits `aggregateRating` with `ratingCount: 1` and `ratingValue: product.rating` **whenever `product.rating` is set**, regardless of whether any real review exists (`app/products/[slug]/page.tsx`). This is exactly the pattern Google penalises as invalid/spammy structured data, and it shows a star rating the product may not have earned. **Impact:** rich-result penalty risk; misleading stars. **Recommend:** emit `aggregateRating` only when a genuine `ratingCount > 0` from real reviews (the service detail page was already corrected to do this).
- **D2. Product cards expose Wishlist + Compare but the header has no entry to either list from the card context — Low.** `ProductCard` adds to compare/wishlist with a toast (`ProductCard.tsx:159`), but discoverability of the Compare/Wishlist pages depends on the navbar/profile. Confirm both are reachable from primary nav, not only deep links.
- **D3. Out-of-stock is handled well — positive.** `isOutOfStock` disables add-to-cart, shows an overlay badge and an in-stock/out-of-stock line (`ProductCard.tsx:169-215`). Good.

---

## E. Services `/services` and `/services/[...segments]`

Already audited in depth (`docs/SERVICE_MODULE_AUDIT.md`) and largely remediated this cycle. UX-relevant residue:

- **E1. Two navigation depths — Medium.** `/services` shows category cards with one level of child chips; deeper taxonomy is reachable only by URL or by drilling through `CategoryBrowseClient`. Deep services are hard to discover from the hub. (Matches audit finding 6.)
- **E2. Legacy `/services/printing|legal|software` fall back to hardcoded pages — Medium.** These now post to `bookings_v2` (fixed this cycle) but are still a separate visual template from the DB-driven service pages; a user comparing two services can get two different layouts.

---

## F. Booking `/book` and `/booking-success`

**Evidence:** `BookPageClient`, `BookingForm.tsx`, `booking-success/page.tsx`.

- **F1. Booking form is long and single-column with mixed required/optional — Medium.** Name*, Phone*, Email, Company, Date/slot, District, Upazila, tier, dynamic fields, documents, coupon, Details* (`BookingForm.tsx`). Required fields are marked, and focus-on-error was added, but the form has no step grouping. On mobile it is a long scroll. **Impact:** friction on the highest-intent action. **Recommend:** visually group (Contact / Schedule / Requirements) — no logic change needed.
- **F2. Confirmation → next steps are strong (post-fix).** Success page shows booking number, inline invoice, Pay Now, Track and Download PDF. Good. **No action.**

---

## G. Cart `/cart`

**Evidence:** `app/cart/page.tsx`.

- **G1. Coupon "apply" fails silently — High.** `applyCoupon` does `try { setAppliedCoupon(await validateCoupon(...)) } catch { /* ignore */ }` (`cart/page.tsx:52-56`). An invalid or below-minimum coupon produces **no message at all** — the field just doesn't change. **Impact:** the user retypes, assumes the site is broken, or abandons. **Recommend:** surface the validation error (the checkout page already tracks `couponError`; the cart swallows it).
- **G2. Auto-clamping quantity on stock change is silent-ish — Medium.** The stock-validate effect calls `updateQuantity(product_id, available)` to reduce quantities to what's in stock, then shows a generic "Some items have limited stock" banner (`cart/page.tsx:38-49`). The specific line's quantity changes under the user without naming which item or why the total dropped. **Impact:** confusing total change. **Recommend:** name the affected item in the warning.
- **G3. Delivery shown as "At checkout" — Low (acceptable).** Subtotal and total are shown; delivery is deferred. Reasonable given zone-based delivery, but the "Total" line therefore isn't the final payable — worth a "excl. delivery" caption.
- **G4. Positives.** Sticky order summary, stock re-validation on mount, empty-state with CTA, continue-shopping link. Solid.

---

## H. Checkout `/checkout`

**Evidence:** `app/checkout/page.tsx` (head).

- **H1. Empty-cart guard can bounce a returning user mid-hydration — Low (already mitigated).** `orderPlacedRef` guards the post-order redirect race; the empty-cart redirect waits for `hydrated`. Correctly handled — noted as a strength.
- **H2. Default district hardcoded to "Sylhet", payment to "bkash" — Low.** Sensible local defaults, but a Dhaka customer must change district before the delivery charge is right; ensure the charge recomputes on change (it uses `useDistrictUpazila` + `calcDeliveryCharge`). Confirm the summary updates live.
- **H3. OTP is settings-gated (`checkout_otp_required`) — positive.** Flexible; good.
- **H4. Coupon errors ARE handled here (`couponError`)** — inconsistent with the cart (G1). Unify.

---

## I. Search `/search`

**Evidence:** `app/search/page.tsx`.

- **I1. No search input on the search page — High (usability).** The page renders results for `?q=` but contains no `<input>`/`<form>` (grep: 0). To change the query the user must return to the navbar search. The 404 page *does* have a box that routes here, then the box disappears. **Impact:** dead-end results page; refine-in-place is impossible. **Recommend:** put the query in an editable input in the search header.
- **I2. Progressive merge is excellent — positive.** Core (product+service) results resolve independently of blog, cache is shown first with a "Showing saved results" status, `Promise.allSettled` prevents a slow blog call from blocking (`search/page.tsx:80-150`). Strong resilience engineering.
- **I3. Result count in the subtitle updates as blog arrives — Low.** The "N results" number can jump upward a second after load as blog merges. Minor.

---

## J. Auth `/login`, `/register`, `/forgot-password`

**Evidence:** `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `components/auth/CustomerOtpForm.tsx`.

- **J1. Login and Register are the same OTP form with different copy — Medium (conceptual).** Both render `<CustomerOtpForm>` (`redirectTo` differs only — `/orders` vs `/profile`). There is no password, so "Register" vs "Login" is a distinction without a mechanism — a phone that has never ordered and one that has both just receive an emailed OTP. **Impact:** two menu entries imply two flows that are identical; mild confusion. **Recommend:** a single "Sign in / Sign up with phone" entry, or keep both but make copy explicit that it's the same OTP.
- **J2. `/forgot-password` is correctly handled — positive (was flagged, now resolved).** The page does *not* offer a broken password reset. It explicitly explains the auth model — "Our login is phone-based — no password required" — and routes the user to phone/WhatsApp support, Back to Login, and Track Order (`forgot-password/page.tsx`). This is the right answer for passwordless OTP auth; the earlier "smell" is unfounded. **No action.**
- **J3. OTP is emailed and requires name + phone + email — Medium (friction vs. clarity).** `CustomerOtpForm` sends the 4-digit code to the customer's **email**, not SMS (`CustomerOtpForm.tsx:42-49,86`), and validates all three fields before sending. A `devHint` warns when email delivery failed and the code is only in the server log (`CustomerOtpForm.tsx:49,87-91`). **Impact:** a customer expecting an SMS OTP (the Bangladesh norm) may be surprised the code is in email; requiring email at sign-in is heavier than phone-only. Clear copy mitigates it, but SMS-first would match local expectation. **Recommend:** confirm email OTP is intentional over SMS; the copy is honest, so this is a product decision, not a bug.
- **J4. Logged-in redirect is correct — positive.** `/login` → `/orders`, `/register` → `/profile` when already logged in.
- **J5. Navbar login entry is a fixed link — Low.** The header user icon always points to `/login` with aria-label "Customer login / dashboard" (`Navbar.tsx:196-206`), regardless of session state; a logged-in user tapping it lands on the login form (which then redirects). Minor; the redirect saves it.

---

## K. Customer area `/profile`, `/dashboard`, `/orders`, `/orders/[orderNumber]`, `/profile/{addresses,invoices,settings,wishlist}`, compare

- **K1. `/dashboard` is a bare redirect to `/profile` — Low.** `dashboard/page.tsx` is `redirect("/profile")`. Fine, but the profile breadcrumb + hero call the page "Dashboard" while the route is `/profile` and the navbar/bottom-nav label it "Profile" (`profile/page.tsx:36-40`, `orders/page.tsx`) — three names for one place. Pick one.
- **K2. Orders list & order detail are clean and gated — positive.** `/orders` has loading / error / empty states with CTAs and logout; `/orders/[orderNumber]` has loading, a "Order not found" error state, and print-to-invoice (`orders/[orderNumber]/page.tsx:57-76`). Cards link to detail. Good.
- **K3. `/profile` portal has no auth gate — Low.** The page renders for anyone; when logged out it shows a generic "Customer" avatar and all eight portal tiles (`profile/page.tsx:44-70`). The *destinations* gate themselves server-side (orders/invoices need a token), so nothing leaks — but an unauthenticated visitor sees a "client portal" with no prompt to sign in first. **Recommend:** show a sign-in CTA when `session` is null.
- **K4. `/profile/invoices` can't tell "logged out" from "no orders" — Medium.** When there's no session token the effect sets `loading=false` with an empty list, so the page shows the same "No invoices yet" state as a verified user with zero orders (`profile/invoices/page.tsx:28-31,53-56`). **Impact:** a logged-out user is told they have no invoices instead of being asked to sign in. **Recommend:** branch on `!session?.token` → render a "Sign in to view invoices" prompt.
- **K5. `/profile/addresses` add-form fails silently on invalid input — Medium.** `handleAdd` `return`s with no feedback when label is empty, address < 10 chars, or the phone regex fails (`profile/addresses/page.tsx:23-24`). The Save button appears to do nothing. **Impact:** same silent-rejection anti-pattern as the cart coupon (G1). **Recommend:** show inline validation messages. *(Addresses are stored locally in `customerProfile` store — not synced server-side; acceptable for a convenience feature but worth noting they won't follow the user across devices.)*
- **K6. `/profile/settings` is solid — positive.** Editing the phone number forces OTP re-verification (logout → `/login`) because the session token is bound to the verified phone — correctly explained in a code comment and enforced (`profile/settings/page.tsx:34-40`). Notification prefs + email persist to the profile store; logout present.
- **K7. `/profile/wishlist` — Low.** Empty-state with "Browse Products" CTA and remove work (`profile/wishlist/page.tsx`). **Nit:** the remove control is a **filled heart** icon (`fill-current`), which normally signals "favourited/add," not "remove" — mildly ambiguous. A trash/X icon would read clearer.
- **K8. Compare empty-state and clear-all present — positive** (`compare/page.tsx`). Spec rows derived from the union of product `specifications`. **Watch:** with 3–4 products the table is wide on mobile; confirm it scrolls rather than squashing.

---

## L. Navigation — Navbar, MegaMenu, MobileBottomNav

**Evidence:** `MobileBottomNav.tsx`, `Navbar.tsx`, `MegaMenu.tsx`.

- **L1. Bottom nav profile tab swaps target by auth — good, but label churn — Low.** Logged out → "Track" (Package icon) → `/track`; logged in → "Profile" (User icon) → `/profile` (`MobileBottomNav.tsx:26-38`). Sensible, but the tab's identity changes under the user after they log in mid-session. Acceptable.
- **L2. Active-state logic is thoughtful — positive.** `/cart` doesn't self-highlight; `/checkout` keeps cart active so the user knows the cart button returns to review (`MobileBottomNav.tsx:44-47`). Nice detail.
- **L3. Search absent from the mobile bottom nav — Medium.** The 5 tabs (Home/Shop/Cart/Services/Profile) omit Search. On mobile, search lives only in the fixed top capsule (`Navbar.tsx:143-173`, a toggle that expands an input). The header *is* `fixed`, so search is reachable without scrolling to page top — that mitigates it — but a store's primary discovery action has no persistent tab. **Recommend:** consider a search entry, or accept the always-visible top toggle as sufficient.
- **L4. Navbar search + MegaMenu are well-built — positive.** Desktop search is a `role="combobox"` with `SearchSuggestions` autocomplete and submit to `/search?q=` (`Navbar.tsx:144-161`); mobile menu has its own search field. MegaMenu is driven by **live taxonomy** with hardcoded fallback, `aria-haspopup`/`aria-expanded`, click-outside close, and a "View all →" footer per menu (`MegaMenu.tsx:112-181`).
- **L5. MegaMenu opens on hover with no delay; keyboard opens only via click — Low.** `onMouseEnter` opens the panel immediately (`MegaMenu.tsx:119`), which can trigger accidental opens when the pointer crosses the trigger; keyboard/touch users rely on the click handler (which works). **Recommend:** a small open-delay and/or focus-driven open would smooth pointer + keyboard parity. Minor.
- **L6. Brand tagline renders with a leading colon — Low (cosmetic).** The header tagline is output as `: {getBrandTagline(lang)}` (`Navbar.tsx:135`), so it displays as ": <tagline>". Likely an unintended prefix. Trivial polish.

---

## M. Content pages — About, Blog, FAQ, Testimonials, Contact, Legal, Career, Shipping

- **M1. Contact form is strong — positive.** react-hook-form + zod validation with `aria-invalid`/`aria-describedby` on every field, offline-queue awareness (`isQueuedResponse` → "Message queued offline"), success screen with a reference badge, and CMS-driven phone/email/address/map (`contact/page.tsx:39-96,148-205`). Best-in-class among the forms.
- **M2. Legal pages use a shared `LegalPageLayout` — positive** (consistent long-form reading; recent commits improved responsiveness).
- **M3. FAQ is CMS-driven (`resolveFaqItems`)** and appears both on home and `/faq` — consistent source. Good.
- **M4. About page is complete and CMS-overridable — positive.** Story, vision, timeline, values, team all render; team roster and story image fall back to hardcoded defaults but accept CMS overrides (`about/page.tsx:41-51`). **Note (business content, not a bug):** the "Key Achievements" figures — *10,000+ Happy Customers, 50+ Projects, 200+ Products, 8+ Years* — are hardcoded (`about/page.tsx:34-39`). If these are aspirational rather than measured, they carry a trust/claims risk; confirm they're accurate.
- **M5. Career page — Low/Medium (evergreen listings).** The apply form validates via toast and posts to `careerApi` (`career/page.tsx:43-78`). But `POSITIONS` is a hardcoded array of three roles (`career/page.tsx:19-23`) always shown as "open," regardless of whether the company is actually hiring. **Impact:** perpetual vacancies erode credibility and generate dead-end applications. **Recommend:** drive openings from data (or an admin flag), or state "we accept general applications."
- **M6. Shipping page — Medium (charge consistency).** The coverage table advertises *Sylhet City: Free, District: from ৳40, Nationwide: from ৳60* as a hardcoded constant (`shipping/page.tsx:10-14`). Checkout, however, computes delivery from zone via `calcDeliveryCharge` + optional per-product overrides. **Impact:** if the two ever diverge, a customer sees one price on `/shipping` and another at checkout — a trust hit at the worst moment. **Recommend:** source both from one settings-driven table.
- **M7. Testimonials page is resilient — positive, with a Low nit.** Cache-first load, moderation-aware submit ("will appear after approval"), star-picker form (`testimonials/TestimonialsClient.tsx:29-94`). **Nit:** the hero always renders five filled gold stars next to the computed average (`TestimonialsClient.tsx:105`), and the average falls back to "5.0" with "(0 reviews)" when empty — so a 3.x average or an empty list still shows a perfect five-star row. **Recommend:** render the star row from the actual average.
- **M8. Blog list + post are well-built — positive.** `/blog` (SSR → `BlogPageClient` → `BlogGrid`) paginates; `/blog/[slug]` is fully SSR with `generateMetadata`, OpenGraph/Twitter cards, `notFound()` on a missing post, and valid `Article` JSON-LD (`blog/[slug]/page.tsx:28-103`). Strong SEO. No defects.

---

## N. Media — Gallery `/gallery`, Projects `/projects/[slug]`

Audited and fixed this cycle:
- Embed detection now provider-agnostic; YouTube/Vimeo play; CSP `frame-src` opened; iframe `allow` includes `autoplay; encrypted-media` so **sound works**. **Positive, resolved.**
- **N1. Empty video gallery shows an admin-facing instruction card — Medium.** When no videos exist, `/gallery` renders a card telling the visitor to "Add a YouTube/Vimeo link in Admin → Showcase" (`gallery/page.tsx:108-123`). This is **admin guidance shown to the public**. A customer sees internal instructions. **Recommend:** show a neutral empty state to visitors; keep the admin hint behind an auth check.

---

## O. Error / empty / loading states

- **O1. 404 is well-built — positive.** Bilingual, search box, Home + Browse CTAs (`not-found.tsx`).
- **O2. Empty states are consistent** via `EmptyState` (cart, orders, compare) — good design-system use.
- **O3. Loading states exist per page but see A1** (no global indicator) and B3 (generic skeleton).

---

## P. Transactional flow — Payment callback `/payment/callback`, Order success `/order-success`

**Evidence:** `payment/callback/page.tsx`, `order-success/page.tsx`. This is the money path — audited closely.

- **P1. Payment callback covers all four outcomes — positive.** `verifying → success → failed → error` states each render distinct UI (`payment/callback/page.tsx:98-172`). It handles both SSLCommerz redirects (`?status=success|failed|cancelled`) and bKash/Nagad verification via `paymentsApi.verify*`, distinguishes "cancelled" copy, and on failure offers *Try Again* → `/checkout` plus *Track Order*. Verification errors tell the user to contact support rather than leaving a blank screen. Solid, defensive money-flow handling.
- **P2. Success redirect depends on query params surviving the gateway — Medium (verify).** On success the page waits 2.5 s then `router.push`es to `/order-success?order=…&phone=…`, taking `order_number`/`order`/`phone` from the URL or the verify response (`payment/callback/page.tsx:38-52,64-96`). If a gateway drops those params and the verify response omits them, the customer reaches `/order-success` **without a phone**, so the invoice preview can't auto-load (see P4). **Impact:** paid customer sees a thinner confirmation. **Recommend:** confirm the verify endpoint always returns `order_number` + `customer_phone`.
- **P3. Order-success is excellent — positive.** Reads a checkout-time **snapshot** so the invoice renders instantly, then replaces it with the API's authoritative invoice (`order-success/page.tsx:69-91`); confetti, order number with "save this to track," inline `InvoiceCard`, dismissible invoice prompt, PDF download, Track / Share / Continue Shopping, and analytics `purchase` events. Comprehensive.
- **P4. Invoice preview needs both order + phone — Low.** `canDownloadInvoice` and the API invoice load both require `order` *and* `phone` in the URL (`order-success/page.tsx:69-114`). Direct navigation with only an order number shows the order block but no invoice preview/PDF button. Acceptable (the snapshot still shows if present), but ties back to P2.

---

## Severity roll-up (most actionable first)

| # | Finding | Page | Severity |
|---|---|---|---|
| D1 | Fabricated `aggregateRating` (ratingCount:1 always) | Product detail | **High** |
| G1 | Coupon apply fails silently | Cart | **High** |
| I1 | No search input on the search page | Search | **High** |
| N1 | Admin instructions shown to public visitors | Gallery | **Medium** |
| A1 | No global navigation loading indicator | Global | **Medium** |
| K4 | Invoices page can't tell "logged out" from "no orders" | Profile | **Medium** |
| K5 | Address add-form fails silently on invalid input | Profile | **Medium** |
| M6 | `/shipping` charges hardcoded, may diverge from checkout | Shipping | **Medium** |
| M5 | Career page shows evergreen (always-open) vacancies | Career | **Medium** |
| P2 | Payment-success redirect may drop phone → no invoice | Payment | **Medium** |
| L3 | Search absent from mobile bottom nav | Nav | **Medium** |
| G2 | Silent quantity clamp doesn't name the item | Cart | **Medium** |
| J1/J3 | Login=Register OTP duplication; OTP is email not SMS | Auth | **Medium** |
| B1 | 14-section homepage cognitive load | Home | **Medium** |
| C3 | Search UX differs between `/products` and `/search` | Products | **Medium** |
| M4 | Hardcoded "10,000+ customers" achievement claims | About | **Medium** |
| A2/A3 | Language flash; order date locale mismatch | Global | **Medium/Low** |
| K1 | "Dashboard" vs "Profile" naming | Customer | **Low** |
| K3/K7 | No sign-in prompt on portal; ambiguous wishlist-remove icon | Profile | **Low** |
| L5/L6 | MegaMenu hover-open; leading-colon tagline | Nav | **Low** |

## Confirmed strengths (do not change)
- Structured data across home/product/service/blog (except D1's fabricated product rating).
- Search resilience (independent core/blog resolution, cache-first, `allSettled`).
- Products listing: error/retry vs. empty distinction + cache fallback (C1 resolved).
- Money flow: payment callback covers all four outcomes; order-success renders a snapshot invoice instantly then reconciles with the API.
- Passwordless auth handled honestly — `/forgot-password` explains the model instead of offering a dead reset (J2 resolved).
- Contact form: zod + full aria wiring + offline queue; settings/settings page enforces OTP re-verification on phone change.
- Cart stock re-validation; checkout order-placed race guard.
- Consistent `EmptyState` / `PageHero` / design-system usage; strong `not-found` page.
- Bottom-nav active-state intelligence; taxonomy-driven MegaMenu.
- Accessibility baseline (aria-labels, roles, aria-busy).

## Explicitly Not Implemented (confirmed absent, not oversights)
- On-page search input on `/search` (I1) — results are `?q=`-driven only.
- Global route-transition progress bar (A1).
- Anchor/section nav for the 14-section homepage (B1).
- Server-side persisted language / language in URL (A2) — language is client-only.
- Server-synced saved addresses (K5) — addresses live in a local store, per-device.

*All 40 public routes have now been opened and audited; there are no remaining "not audited" pages.*
