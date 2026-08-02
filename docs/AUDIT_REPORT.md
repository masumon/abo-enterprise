# Homepage Redesign Audit Report
**Date:** August 3, 2026  
**Project:** ABO Enterprise Homepage Redesign  
**Current Branch:** feature/artifact-compliance-gaps-final  

---

## EXECUTIVE SUMMARY

The homepage redesign requires **significant structural changes** with **15-17 distinct implementation phases**. The current implementation uses a tabbed lane-switcher pattern, but the target design requires a **linear, section-based layout** with reorganized content hierarchy and new components.

**Effort Estimate:** 18-24 days (assuming single developer)  
**Risk Level:** MEDIUM  
**Breaking Changes:** LOW (existing routing and APIs remain unchanged)

---

## 1. HOMEPAGE ARCHITECTURE

### Current Architecture
```
HomePage (page.tsx)
├── Hero (mobile & desktop views)
├── LaneSwitcher (sticky navigation)
├── HomeLanes (tabbed interface: Shop/Services/Software)
│   ├── TrustBadges & HomeSectionRail (interstitial)
│   ├── FeaturedProducts (Shop tab)
│   ├── ServicesOverview (Services tab)
│   └── Portfolio (Software tab)
├── CustomerReviews (marquee slider)
├── FAQ (accordion)
├── LeadCapture (consultation form)
└── ContactSection
```

### Target Architecture (Linear, Section-Based)
```
HomePage
├── Header/Navbar (unchanged)
├── Hero (updated)
├── Flash Sale (NEW - prominent placement)
├── Featured Products (NEW - flat grid with category tabs)
├── Services Section (modified from current)
├── Software Solutions (NEW - dedicated section)
├── Features/Benefits Row (NEW - 6-8 feature icons)
├── Brand Partners (existing ClientLogos, promoted)
├── Why Choose Us (NEW - 6 trust/benefit cards)
├── Customer Reviews (enhanced with stats card)
├── Review Statistics (NEW - 4.8★, 10K buyers, etc.)
├── FAQ (existing component)
├── AI Consultation (LeadCapture moved up, enhanced visuals)
├── Contact CTA (new floating/sticky element)
└── Footer (restructured sections)
```

**Key Difference:** The new design eliminates the tabbed lane-switcher in favor of a linear, scrollable layout with all content visible. This is a **fundamental UX shift**.

---

## 2. COMPONENT INVENTORY

### A. EXISTING COMPONENTS (REUSABLE)

| Component | Location | Status | Reusable | Notes |
|-----------|----------|--------|----------|-------|
| **Hero** | `home/Hero.tsx` | ✅ Exists | 80% | Mobile/desktop split exists. Need to add flash sale countdown integration. |
| **FeaturedProducts** | `home/FeaturedProducts.tsx` | ✅ Exists | 70% | Currently uses PromoSlider + product cards. Need category tab filtering. |
| **ServicesOverview** | `home/ServicesOverview.tsx` | ✅ Exists | 60% | Uses 3-col grid. Target shows 4-col grid. Layout tweak needed. |
| **Portfolio** | `home/Portfolio.tsx` | ✅ Exists | 50% | Currently light. Target shows detailed software cards. Needs major expansion. |
| **CustomerReviews** | `home/CustomerReviews.tsx` | ✅ Exists | 85% | Marquee slider works. Add new ReviewStats card alongside. |
| **FAQ** | `home/FAQ.tsx` | ✅ Exists | 95% | Accordion works. May need styling refresh only. |
| **LeadCapture** | `home/LeadCapture.tsx` | ✅ Exists | 90% | Form logic solid. Visual redesign (AI illustration) needed. |
| **ContactSection** | `home/ContactSection.tsx` | ✅ Exists | 75% | Restructure for new layout. May need Google Maps removal. |
| **TrustBadges** | `home/TrustBadges.tsx` | ✅ Exists | 50% | Currently small. Target shows prominent cards. Major redesign. |
| **ClientLogos** | `home/ClientLogos.tsx` | ✅ Exists | 95% | Already works as slider. Promote to dedicated section. |
| **ProductCard** | `features/ProductCard.tsx` | ✅ Exists | 95% | Reuse as-is. Already has wishlist, ratings, cart. |
| **GlassCard** | `ui/GlassCard.tsx` | ✅ Exists | 95% | Use for service/software cards. |
| **Accordion** | `ui/Accordion.tsx` | ✅ Exists | 95% | Use for FAQ (already does). |
| **CountdownTimer** | `ui/CountdownTimer.tsx` | ✅ Exists | 95% | Use for flash sale. Already integrated in FeaturedProducts. |
| **PromoSlider** | `ui/PromoSlider.tsx` | ✅ Exists | 95% | Reuse for brand logos. |

### B. NEW COMPONENTS REQUIRED

| Component | Purpose | Complexity | Est. Time |
|-----------|---------|-----------|-----------|
| **FlashSaleSection** | Dedicated flash sale with prominent countdown, 4-col grid, "View All" button | HIGH | 6 days |
| **ProductCategoryTabs** | Filter featured products by category (All/Mobile/Laptop/Audio/Watch/Camera) | MEDIUM | 3 days |
| **ReviewStatsCard** | Display 4.8★, 10K buyers, 25K products, 2,847 reviews, 99.2% satisfaction | LOW | 2 days |
| **SoftwareCard** | Enhanced card for software solutions with image, title, desc, link | MEDIUM | 2 days |
| **WhyChooseUsCards** | 6 trust/benefit cards with icons (warranty, delivery, payment, return, etc.) | MEDIUM | 3 days |
| **FeatureIconsRow** | Horizontal row of 6-8 feature icons (demo, consultation, integration, support, etc.) | LOW | 2 days |
| **BrandPartnersSection** | Existing ClientLogos promoted as standalone section | LOW | 1 day |
| **ContactCTABanner** | Floating or sticky CTA for phone/WhatsApp contact | LOW | 2 days |
| **AiIllustration** | Decorative SVG/image for AI consultation section | LOW | 1 day |

**New Components Total:** 8-9 new components  
**Estimated Creation Time:** 20-23 days (full implementation)

---

## 3. CURRENT VS TARGET SECTION COMPARISON

### Section 1: Hero & Flash Sale

**Current:**
- Mobile & desktop split
- Stats badge
- CTA button
- Sticky LaneSwitcher below

**Target:**
- Mobile & desktop split (same)
- Flash sale countdown immediately after
- "Flash Sale" label with fire emoji
- Countdown timer (DD:HH:MM format)
- 4 product cards in grid (flash sale items)

**Changes Required:**
- Add flash sale display inline with hero OR as separate section
- Move countdown timer from nested position to prominent top
- Add 4-product grid display
- Add "View All Flash Sales" button
- **Component:** FlashSaleSection (NEW)

---

### Section 2: Featured Products with Category Tabs

**Current:**
- Part of tabbed HomeLanes (only visible if "Shop" tab active)
- Grid of products
- No category filtering visible
- "View All Products" button

**Target:**
- Flat section (always visible)
- Category tabs: All | Mobile | Laptop | Audio | Smart Watch | Camera | Audio
- 4-product grid (2x2 mobile, 4 columns desktop)
- Stars/ratings visible
- Pricing with discounts
- "View All Products" button at bottom

**Changes Required:**
- Remove from HomeLanes tabbed interface
- Create standalone FeaturedProducts section
- Add category tab filtering
- Update grid layout to match target
- **Components:** ProductCategoryTabs (NEW), FeaturedProducts (MODIFY)

---

### Section 3: Services Section

**Current:**
- 6 service cards in 3-column grid
- Part of HomeLanes (only visible if "Services" tab active)
- Service name, description, "Learn more" link

**Target:**
- Flat section (always visible)
- Title: "আমাদের সেবাসমূহ" with view all link
- 4 cards in grid (2x2 mobile, 4 desktop)
- Each card: Icon, title, description, "বিস্তারিত দেখুন" link
- Same 4 service types: পাসপোর্ট সেবা, জাতীয় পরিচয়পত্র, প্রিন্টিং সেবা, ক্লাউড লাইসেন্স

**Changes Required:**
- Remove from HomeLanes tabbed interface
- Flat section layout
- Grid adjustment to 4 cards
- Add section title & view-all link
- **Components:** ServicesOverview (MODIFY)

---

### Section 4: Software Solutions

**Current:**
- Portfolio component (minimal)
- Part of HomeLanes tabbed interface
- Simple card layout

**Target:**
- Dedicated "সফটওয়্যার সমাধান" section
- 4 software solution cards (ABO POS, BD CR7 ERP, CLOTHIFY, SUMONIX AI)
- Each card: Brand image, title, description, "বিস্তারিত দেখুন" link
- Below: Feature icons row (ভিডিও ডেমো, ফ্রি কনসালটেশন, সহজ ইন্টিগ্রেশন, ২৪/৭ সাপোর্ট)
- Optional: Slider/pagination dots

**Changes Required:**
- Create new SoftwareCard component
- Create FeatureIconsRow component
- Replace Portfolio with dedicated section
- Add feature icons display
- **Components:** SoftwareCard (NEW), FeatureIconsRow (NEW), Portfolio (MODIFY)

---

### Section 5: Brand Partners

**Current:**
- ClientLogos component exists but not visible on homepage
- Only in certain pages

**Target:**
- Dedicated "আমাদের ব্র্যান্ড পার্টনার" section
- Brand logo carousel/slider (Apple, Samsung, HP, Dell, ASUS, Lenovo, Xiaomi, Realme)
- Title with "see all" link
- Pagination dots

**Changes Required:**
- Extract ClientLogos to independent section
- Add to main homepage
- Ensure responsive slider
- **Components:** BrandPartnersSection (existing ClientLogos, minimal changes)

---

### Section 6: Why Choose Us

**Current:**
- TrustBadges component exists (small, interstitial)
- Shows basic badges

**Target:**
- Dedicated section: "কেন আমাদের বেছে নেবেন?"
- 6 cards in 2 rows (3 cols each)
- Cards: ১০০% অরিজিনাল প্রোডাক্ট, ঢাকায় ফ্রি ডেলিভারি, সহজ রিটার্ন, নিরাপদ পেমেন্ট, সেরা রিটার্ন পলিসি, ২৪/৭ সাপোর্ট
- Each with icon, title, description

**Changes Required:**
- Expand TrustBadges into dedicated cards
- Reorganize layout from horizontal to grid
- Add descriptions
- **Components:** WhyChooseUsCards (NEW), TrustBadges (MODIFY or replace)

---

### Section 7: Customer Reviews

**Current:**
- Marquee slider layout
- Shows testimonials
- Average rating displayed
- "View All Reviews" button

**Target:**
- Same marquee/carousel layout
- Add ReviewStatsCard showing:
  - 4.8 / 5 (rating)
  - 10,000+ (verified buyers)
  - 25,000+ (total products)
  - 2,847 (total reviews)
  - 99.2% (satisfaction rate)
- "View All Reviews" button

**Changes Required:**
- Add ReviewStatsCard component next to reviews
- Display metrics in prominent card
- **Components:** ReviewStatsCard (NEW), CustomerReviews (MODIFY)

---

### Section 8: FAQ

**Current:**
- Accordion component
- Works well
- "View All FAQ" button

**Target:**
- Same accordion layout
- Same button
- Minimal changes

**Changes Required:**
- Styling refresh only
- **Components:** FAQ (MINIMAL CHANGES)

---

### Section 9: AI Consultation

**Current:**
- LeadCapture component
- Form with: Name, Company, Phone, Email, Lead Type, Project Description, Budget Range
- Submit button

**Target:**
- Form + AI illustration on right side
- Title: "আপনার ব্যবসার জন্য সেরা AI সলিউশন খুঁজে নিন"
- Decorative AI robot/chat illustration
- Form fields same but styled differently
- CTA buttons: "কি পরামর্শ", "কান নিউগোলে চার্জ নেই", "দ্রুত সাপোর্ট"
- Color scheme: Purple/lavender background

**Changes Required:**
- Add AI illustration/graphic
- Redesign form layout (side-by-side on desktop)
- Update styling (purple color scheme)
- Add feature badges
- **Components:** LeadCapture (MODIFY), AiIllustration (NEW)

---

### Section 10: Contact/Footer CTA

**Current:**
- ContactSection at bottom
- Maps embed (if available)
- Contact info

**Target:**
- Sticky/floating contact bar with phone number
- WhatsApp, Messenger, YouTube, Facebook icons
- "যোগাযোগ করুন আমাদের সাথে" header
- Hours: "সকাল ৯টা - রাত ৯টা"
- Blue background with white text

**Changes Required:**
- Create ContactCTABanner (sticky footer bar)
- Reorganize ContactSection
- **Components:** ContactCTABanner (NEW), ContactSection (MODIFY)

---

### Section 11: Footer

**Current:**
- Footer.tsx component
- Multiple columns with navigation, trust badges, payment methods, etc.
- Newsletter signup
- Social links

**Target:**
- Enhanced structure with sections:
  1. Logo + Company info
  2. Quick links (কুইক লিংকস)
  3. Trusted info (সাধি সূচ - TREAD, TIN, BIN, DBID)
  4. Payment methods
  5. Newsletter signup
  6. App downloads
  7. Copyright + developer credits
- More spacious layout
- Better organized sections

**Changes Required:**
- Restructure Footer.tsx
- Add section headers
- Improve spacing
- Update styling
- **Components:** Footer (MODIFY)

---

## 4. DEPENDENCY IMPACT ANALYSIS

### A. API DEPENDENCIES

| API | Current Usage | Target Usage | Changes |
|-----|---------------|--------------|---------|
| `productsApi.list()` | FeaturedProducts | FeaturedProducts + FlashSaleSection | ✅ Same. Reuse with query params. |
| `servicesApi.list()` | ServicesOverview | ServicesOverview (flat section) | ✅ Same. Layout change only. |
| `reviewsApi.list()` | CustomerReviews | CustomerReviews + ReviewStats | ✅ Same. Stats calculated from data. |
| `publicApi.stats()` | Hero (for stats badge) | Hero + potential ReviewStats | ✅ Same. Already fetched. |
| `promoSlidesApi.list()` | PromoSlider (hero) | PromoSlider (hero + brand logos) | ✅ Same. Reuse for logos. |
| `serviceLeadsApi.create()` | LeadCapture | LeadCapture (AI form) | ✅ Same. Form logic unchanged. |

**API Impact:** ✅ **ZERO BREAKING CHANGES** - All existing APIs work as-is. No new endpoints required.

### B. CMS DEPENDENCIES

| Setting | Current | Target | Changes |
|---------|---------|--------|---------|
| `hero_image_url` | ✅ Used | ✅ Used | None |
| `hero_mobile_image_url` | ✅ Used | ✅ Used | None |
| `hero_title_en/bn` | ✅ Used | ✅ Used | None |
| `hero_subtitle_en/bn` | ✅ Used | ✅ Used | None |
| `hero_cta_text/url` | ✅ Used | ✅ Used | None |
| `flash_sale_end` | ✅ Used (FeaturedProducts) | ✅ Used (FlashSaleSection) | Move to top-level usage |
| `flash_sale_title_en/bn` | ✅ Used (FeaturedProducts) | ✅ Used (FlashSaleSection) | Move to top-level usage |
| NEW: `service_category_display` | ❌ N/A | May need new setting | Optional - can hardcode for now |
| NEW: `brand_partners_display` | ❌ N/A | May need new setting | Existing ClientLogos can be reused |
| NEW: `trust_badges_display` | ❌ N/A | May need new setting | Can use existing TrustBadges logic |

**CMS Impact:** ✅ **MOSTLY COMPATIBLE** - No breaking CMS changes needed. Admin already controls flash sale & hero content.

### C. Admin Panel Dependencies

| Page | Current | Target | Changes |
|------|---------|--------|---------|
| `/admin/homepage` | ✅ Exists | ✅ Used | Add controls for new sections (optional) |
| `/admin/products` | ✅ Products managed | ✅ Products managed | None |
| `/admin/services` | ✅ Services managed | ✅ Services managed | None |
| `/admin/reviews` | ✅ Reviews managed | ✅ Reviews managed | None |
| `/admin/promo-slides` | ✅ Brand logos managed | ✅ Brand logos managed | None |

**Admin Impact:** ✅ **FULLY COMPATIBLE** - No admin panel changes required. All content already manageable.

---

## 5. ROUTING DEPENDENCIES

| Route | Current | Target | Changes |
|-------|---------|--------|---------|
| `/` (homepage) | ✅ Main page | ✅ Main page | Layout-only changes |
| `/products` | ✅ Shop page | ✅ "View All Products" links to this | None |
| `/services` | ✅ Services page | ✅ "View All Services" links to this | None |
| `/projects` | ✅ Software page | ✅ Software cards link to projects | None |
| `/testimonials` | ✅ Reviews page | ✅ "View All Reviews" links to this | None |
| `/faq` | ✅ FAQ page | ✅ FAQ section links here | None |
| `/contact` | ✅ Contact page | ✅ Contact CTA links to this | None |

**Routing Impact:** ✅ **ZERO BREAKING CHANGES** - All existing routes remain valid and unchanged.

---

## 6. PERFORMANCE ANALYSIS

### Current Issues (From Screenshots & Code)
- LaneSwitcher creates unnecessary re-renders when switching tabs
- Three separate API calls for products/services/portfolio (only one tab visible at a time)
- Large bundle size from dynamic imports

### Target Design Performance Improvements
- ✅ All sections load in viewport order → better lazy loading efficiency
- ✅ Single visible content stream → fewer component state changes
- ✅ Reuse of existing optimized components (ProductCard, GlassCard)
- ✅ FlashSaleSection can share product data with FeaturedProducts (no duplicate fetch)

### Performance Risks Identified
1. **Simultaneous API Calls:** All sections now load content at once
   - **Mitigation:** Keep dynamic imports for sections below fold
2. **Image Optimization:** More product images in view
   - **Mitigation:** Use Next.js Image component with lazy loading (already done)
3. **Reflow:** Tall page height might cause layout shifts
   - **Mitigation:** Use CSS containment, reserve space with skeletons (already done)

**Performance Verdict:** ✅ **NO REGRESSIONS** - Current optimizations sufficient.

---

## 7. RESPONSIVE ISSUES ANALYSIS

### Mobile (< 640px)

**Current:**
- Hero mobile view works
- TabLanes uses full width
- Products in 2-column grid

**Target:**
- Flash sale in 2-column grid (or 1 on very small)
- Category tabs scroll horizontally (if many)
- Services in 2-column grid
- Software in 2-column grid
- Why Choose Us in 1-column stack
- Reviews continue to scroll

**Issues:**
- ❌ Category tabs may overflow on small screens
- ❌ WhyChooseUs cards might be too wide

**Fixes:**
- Use horizontal scroll for category tabs (done in other components)
- Use CSS grid for WhyChooseUs with breakpoints

### Tablet (640px - 1024px)

**Current:**
- Grid adjusts to 3-4 columns
- Works well

**Target:**
- FlashSale: 2x2 grid
- FeaturedProducts: 2x2 grid
- Services: 2x2 grid
- Software: 2x2 grid
- Why Choose Us: 2x3 or 3x2 grid
- Reviews: Full width marquee

**Issues:** ✅ No issues expected

### Desktop (> 1024px)

**Current:**
- Grid uses 4 columns
- Comfortable spacing

**Target:**
- FlashSale: 4 columns
- FeaturedProducts: 4 columns
- Services: 4 columns
- Software: 4 columns
- Why Choose Us: 3 columns (2 rows)
- Reviews: Full width marquee

**Issues:** ✅ No issues expected

**Responsive Verdict:** ⚠️ **MEDIUM RISK** - Category tabs and WhyChooseUs cards need careful breakpoint testing.

---

## 8. ACCESSIBILITY ISSUES

### Current Accessibility
- ✅ Semantic HTML used throughout
- ✅ ARIA labels on interactive elements
- ✅ Alt text on images
- ✅ Keyboard navigation in carousel (PromoSlider)
- ⚠️ Some color contrast issues (need verification)
- ⚠️ LaneSwitcher uses intersection observer (good for scrolling)

### New Components Accessibility Requirements

| Component | Requirement | Status |
|-----------|-------------|--------|
| **FlashSaleSection** | Heading hierarchy, alt text on product images, keyboard navigation for countdown | TODO |
| **ProductCategoryTabs** | ARIA tabs, keyboard arrow navigation, focus indicators | TODO |
| **ReviewStatsCard** | Proper heading hierarchy, stat labels | TODO |
| **SoftwareCard** | Alt text on images, proper headings | TODO |
| **WhyChooseUsCards** | Heading hierarchy, sufficient color contrast for badges | TODO |
| **FeatureIconsRow** | Alt text on icons or aria-label | TODO |
| **AiIllustration** | aria-hidden if decorative, or alt text | TODO |
| **ContactCTABanner** | Sufficient color contrast, keyboard accessible buttons | TODO |

### Accessibility Risks
- ❌ New AI illustration needs aria-hidden or meaningful alt text
- ❌ Purple background in LeadCapture section needs contrast check
- ❌ Category tab focus indicators need verification
- ❌ Review stats numbers might need aria-label for screen readers

**Accessibility Verdict:** ⚠️ **MEDIUM RISK** - Need to implement WCAG 2.1 AA compliance for new components.

---

## 9. REGRESSION RISKS

### HIGH RISK
1. **LaneSwitcher Removal:**
   - Current: Users can jump to sections via sticky switcher
   - Target: Linear scroll-based navigation
   - Risk: Users might miss sections
   - Mitigation: Keep section anchor links, add smooth scroll behavior

2. **Tab Interaction Patterns:**
   - Current: HomeLanes uses URL params (e.g., `?lane=services`)
   - Target: No tabs, flat layout
   - Risk: Bookmarked URLs with `?lane=services` won't work as expected
   - Mitigation: Add 301 redirect for `?lane=*` to relevant sections with hash anchors

3. **Flash Sale Visibility:**
   - Current: Flash sale hidden until "deals" tab selected
   - Target: Always visible
   - Risk: Revenue spike if not handled by backend inventory
   - Mitigation: Ensure backend flash_sale endpoints work correctly

### MEDIUM RISK
4. **Section Ordering:** New order might affect user discovery
   - Risk: Users miss services/software if page is long
   - Mitigation: Sticky header with section links, keep LaneSwitcher or similar

5. **Mobile Scroll Performance:** More content to render
   - Risk: Slower mobile scroll
   - Mitigation: Use React.memo, lazy loading, virtualization if needed

### LOW RISK
6. **API Calls:** All existing APIs continue to work
   - Risk: None — backward compatible

7. **Routing:** No route changes
   - Risk: None — all links remain valid

**Regression Verdict:** ⚠️ **MEDIUM OVERALL** - Main risks are UX/navigation changes, not code breakage.

---

## 10. IMPLEMENTATION ORDER (RECOMMENDED)

### Phase 0: Preparation
- [ ] Review this audit report with team
- [ ] Update project board with phases
- [ ] Set up feature branch for homepage redesign

### Phase 1: Hero & Flash Sale (Days 1-6)
- [ ] Create FlashSaleSection component
- [ ] Extract flash sale logic from FeaturedProducts
- [ ] Add to homepage after Hero
- [ ] Test countdown timer
- [ ] Test responsive layout

### Phase 2: Featured Products with Tabs (Days 7-9)
- [ ] Create ProductCategoryTabs component
- [ ] Update FeaturedProducts to use category filtering
- [ ] Remove from HomeLanes
- [ ] Add to homepage
- [ ] Test category filtering

### Phase 3: Services Section (Days 10-12)
- [ ] Update ServicesOverview layout
- [ ] Change from 3-col to 4-col grid
- [ ] Remove from HomeLanes
- [ ] Add to homepage
- [ ] Test responsive layout

### Phase 4: Software Solutions (Days 13-15)
- [ ] Create SoftwareCard component
- [ ] Create FeatureIconsRow component
- [ ] Update Portfolio component
- [ ] Add to homepage as dedicated section
- [ ] Add feature icons below

### Phase 5: Brand Partners (Days 16)
- [ ] Extract ClientLogos as BrandPartnersSection
- [ ] Add to homepage
- [ ] Test slider responsive behavior

### Phase 6: Why Choose Us (Days 17-19)
- [ ] Create WhyChooseUsCards component
- [ ] Update TrustBadges or replace
- [ ] Add to homepage
- [ ] Test grid layout on mobile

### Phase 7: Reviews & Stats (Days 20-21)
- [ ] Create ReviewStatsCard component
- [ ] Update CustomerReviews section layout
- [ ] Calculate and display review statistics
- [ ] Test marquee + stats display

### Phase 8: AI Consultation (Days 22-23)
- [ ] Create AiIllustration component
- [ ] Update LeadCapture styling
- [ ] Add purple color scheme
- [ ] Test form responsiveness

### Phase 9: Contact CTA & Footer (Days 24-25)
- [ ] Create ContactCTABanner component
- [ ] Update ContactSection
- [ ] Update Footer structure
- [ ] Test sticky behavior

### Phase 10: Remove HomeLanes & LaneSwitcher (Days 26)
- [ ] Delete LaneSwitcher component
- [ ] Delete HomeLanes component (or repurpose)
- [ ] Update page.tsx to remove imports
- [ ] Update routes if any reference HomeLanes

### Phase 11: QA & Testing (Days 27-30)
- [ ] Visual regression testing (mobile, tablet, desktop)
- [ ] API integration testing (all sections load data)
- [ ] Responsive design validation
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance testing (Lighthouse)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Content verification (all CMS content displays correctly)

---

## 11. FILES LIKELY TO BE MODIFIED

### Core Files
```
frontend/src/app/page.tsx (Major restructuring)
frontend/src/app/layout.tsx (Possibly update navbar)
frontend/src/app/globals.css (New utility classes)
```

### Component Files (Existing - Modify)
```
frontend/src/components/home/Hero.tsx
frontend/src/components/home/FeaturedProducts.tsx (Remove from HomeLanes, make standalone)
frontend/src/components/home/ServicesOverview.tsx (Remove from HomeLanes, make standalone)
frontend/src/components/home/Portfolio.tsx (Rename/refactor)
frontend/src/components/home/CustomerReviews.tsx
frontend/src/components/home/LeadCapture.tsx
frontend/src/components/home/ContactSection.tsx
frontend/src/components/home/TrustBadges.tsx
frontend/src/components/layout/Footer.tsx
frontend/src/components/layout/Navbar.tsx (May need adjustments)
frontend/src/components/layout/LaneSwitcher.tsx (DELETE)
frontend/src/components/layout/HomeLanes.tsx (DELETE or archive)
```

### Component Files (New - Create)
```
frontend/src/components/home/FlashSaleSection.tsx (NEW)
frontend/src/components/home/ProductCategoryTabs.tsx (NEW)
frontend/src/components/home/ReviewStatsCard.tsx (NEW)
frontend/src/components/home/SoftwareCard.tsx (NEW)
frontend/src/components/home/FeatureIconsRow.tsx (NEW)
frontend/src/components/home/WhyChooseUsCards.tsx (NEW)
frontend/src/components/home/BrandPartnersSection.tsx (NEW or extract from existing)
frontend/src/components/home/AiIllustration.tsx (NEW)
frontend/src/components/home/ContactCTABanner.tsx (NEW)
```

### Type/Config Files (Possibly)
```
frontend/src/types/index.ts (If new types needed)
frontend/src/lib/homepageContent.ts (If new settings added)
```

---

## 12. FILES LIKELY TO BE CREATED

```
frontend/src/components/home/FlashSaleSection.tsx
frontend/src/components/home/ProductCategoryTabs.tsx
frontend/src/components/home/ReviewStatsCard.tsx
frontend/src/components/home/SoftwareCard.tsx
frontend/src/components/home/FeatureIconsRow.tsx
frontend/src/components/home/WhyChooseUsCards.tsx
frontend/src/components/home/BrandPartnersSection.tsx
frontend/src/components/home/AiIllustration.tsx
frontend/src/components/home/ContactCTABanner.tsx
```

**Total New Files:** 9-10  
**Total Modified Files:** 12-15  
**Total Deleted Files:** 2 (LaneSwitcher, HomeLanes)

---

## 13. KEY ARCHITECTURAL DECISIONS

### 1. Remove Tab-Based Navigation
**Decision:** Replace HomeLanes tabbed interface with linear, scrollable layout  
**Rationale:** Target design shows all sections simultaneously visible, no tabs  
**Impact:** UX change, but functionality preserved (all content still accessible)  
**Alternative:** Keep HomeLanes as fallback (not recommended — adds complexity)

### 2. Promote FlashSale to Top Section
**Decision:** Move flash sale from nested position to prominent placement after hero  
**Rationale:** Target shows flash sale countdown immediately visible  
**Impact:** Better visibility for time-sensitive promotions  
**Alternative:** Keep nested (doesn't match target)

### 3. Flatten Content Hierarchy
**Decision:** Remove tabbed lanes; all sections visible on main page  
**Rationale:** Linear scrolling matches target design  
**Impact:** Longer page, but better content discoverability  
**Alternative:** Paginate content (not in target, adds friction)

### 4. Reuse Existing Components
**Decision:** Refactor/extend existing components rather than rewrite  
**Rationale:** Maintains consistency, reduces bugs, leverages battle-tested code  
**Impact:** Faster implementation, fewer regressions  
**Alternative:** Rewrite from scratch (slower, higher risk)

### 5. Keep LaneSwitcher-Like Navigation (Optional)
**Decision:** Could add back a simplified navigation component if needed  
**Rationale:** Users lose ability to jump to sections on long pages  
**Impact:** Requires additional component, but improves UX  
**Status:** Not in current target, but worth considering for Phase 11

---

## 14. CRITICAL SUCCESS CRITERIA

- [ ] ✅ All sections render without console errors
- [ ] ✅ All API calls succeed (products, services, reviews, stats)
- [ ] ✅ Responsive design validated on mobile (375px), tablet (768px), desktop (1920px)
- [ ] ✅ Flash sale countdown displays correctly
- [ ] ✅ Category tabs filter products correctly
- [ ] ✅ Review stats calculated from data (not hardcoded)
- [ ] ✅ AI illustration displays on desktop, hidden/responsive on mobile
- [ ] ✅ All links (internal & external) functional
- [ ] ✅ No TypeScript errors or warnings
- [ ] ✅ Lighthouse performance score ≥ 70 (mobile), ≥ 85 (desktop)
- [ ] ✅ WCAG 2.1 AA accessibility compliance
- [ ] ✅ No hydration errors in Next.js
- [ ] ✅ All CMS content displays correctly (hero, flash sale, services, etc.)
- [ ] ✅ Dark mode works correctly (all sections)
- [ ] ✅ Existing functionality preserved (cart, wishlist, search, login)

---

## 15. RISK MITIGATION STRATEGIES

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LaneSwitcher removal breaks UX | MEDIUM | MEDIUM | Keep smooth scroll, add back section nav if needed |
| Flash sale backend issues | LOW | HIGH | Verify flash_sale API endpoints work correctly first |
| Performance regression on mobile | MEDIUM | MEDIUM | Use React.memo, lazy loading, test Lighthouse before/after |
| Category tab overflow on small screens | MEDIUM | LOW | Implement horizontal scroll for tabs |
| Color contrast fails accessibility | LOW | MEDIUM | Run accessibility audit before deploy |
| Responsive grid breaks on tablet | LOW | MEDIUM | Test all breakpoints thoroughly |
| AI illustration looks bad on mobile | MEDIUM | LOW | Provide mobile-optimized version or hide gracefully |
| Existing bookmarked URLs break | MEDIUM | MEDIUM | Implement URL hash anchors for deep linking |
| CMS data not displaying | LOW | HIGH | Test all CMS fields before deploy |
| Third-party image CDN fails | LOW | MEDIUM | Use Next.js Image fallbacks, blur placeholders |

---

## 16. TESTING STRATEGY

### Visual Testing
- [ ] Screenshot comparison (current vs target)
- [ ] Manual visual inspection on all breakpoints
- [ ] Dark mode verification
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge, Mobile Safari)

### Functional Testing
- [ ] Product filtering by category
- [ ] Flash sale countdown accuracy
- [ ] Add to cart from product cards
- [ ] Wishlist toggle
- [ ] Form submission (AI consultation)
- [ ] Section scroll navigation

### Performance Testing
- [ ] Lighthouse audit (mobile & desktop)
- [ ] Page load time < 3s on 4G
- [ ] Core Web Vitals (LCP, FID, CLS)
- [ ] No console errors or warnings
- [ ] No memory leaks in DevTools

### Accessibility Testing
- [ ] WCAG 2.1 AA audit with axe-core
- [ ] Keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Color contrast validation (WCAG AA minimum)
- [ ] Focus indicators visible

### API Testing
- [ ] All API endpoints respond correctly
- [ ] Error handling (network failures, 404s, 500s)
- [ ] Caching works as expected
- [ ] Offline mode fallbacks work

---

## 17. DEPLOYMENT CHECKLIST

- [ ] All phases completed and tested
- [ ] Code review approved
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Accessibility audit passes
- [ ] Lighthouse score acceptable
- [ ] E2E tests pass (if applicable)
- [ ] Content verification (CMS data correct)
- [ ] Staging deployment successful
- [ ] Final QA sign-off
- [ ] Git commit with clear message
- [ ] Git push to main branch
- [ ] Vercel deployment triggered
- [ ] Production smoke test (manual)
- [ ] Monitor analytics for 24 hours post-deploy

---

## CONCLUSION

The homepage redesign is **feasible and well-scoped**. The current codebase has solid foundations (reusable components, proper API abstraction, CMS integration). The main changes are **structural (layout-based) rather than functional (API/logic-based)**.

**Key Takeaways:**
1. ✅ Zero breaking API changes required
2. ✅ CMS fully compatible (no migrations needed)
3. ✅ Reuse ~80% of existing components
4. ✅ ~9-10 new components to create
5. ⚠️ UX navigation change (tabbed → linear)
6. ⚠️ Accessibility and responsive testing critical
7. ⚠️ ~24-30 days effort for single developer

**Recommendation:** Proceed with implementation phase-by-phase, starting with Hero + FlashSale section. Deploy to staging after Phase 6 (Brand Partners) for stakeholder feedback before final rollout.

---

## APPENDIX: Component Dependency Graph

```
HomePage (page.tsx)
├── Hero
├── FlashSaleSection (NEW)
│   ├── PromoSlider (existing)
│   └── ProductCard (existing)
├── FeaturedProducts (MODIFY - remove from HomeLanes)
│   ├── ProductCategoryTabs (NEW)
│   ├── ProductCard (existing)
│   └── CountdownTimer (existing)
├── ServicesOverview (MODIFY - remove from HomeLanes)
│   └── GlassCard (existing)
├── SoftwareSection (NEW)
│   ├── SoftwareCard (NEW)
│   ├── FeatureIconsRow (NEW)
│   └── PromoSlider (for carousel)
├── BrandPartnersSection (NEW - extract from ClientLogos)
│   └── PromoSlider (existing)
├── WhyChooseUsCards (NEW)
│   └── GlassCard (existing)
├── CustomerReviews (MODIFY)
│   ├── ReviewStatsCard (NEW)
│   ├── PromoSlider (existing - marquee)
│   └── GlassCard (existing)
├── FAQ (MINIMAL CHANGES)
│   └── Accordion (existing)
├── LeadCapture (MODIFY - add AI section)
│   └── AiIllustration (NEW)
├── ContactCTABanner (NEW - sticky footer)
└── Footer (MODIFY - restructure sections)
```

---

**Prepared by:** Claude Code  
**Status:** Ready for implementation  
**Awaiting:** Team approval before Phase 1 begins
