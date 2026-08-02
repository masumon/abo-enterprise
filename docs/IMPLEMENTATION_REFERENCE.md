# Homepage Redesign — Implementation Reference Guide

## 📁 File Manifest

### A. FILES TO DELETE (2 files)
```
❌ frontend/src/components/layout/LaneSwitcher.tsx
❌ frontend/src/components/layout/HomeLanes.tsx
```

### B. FILES TO MODIFY (12-15 files)

#### Core App Files
```
🔧 frontend/src/app/page.tsx
   - Remove LaneSwitcher & HomeLanes imports
   - Add new component imports (FlashSaleSection, etc.)
   - Restructure render to linear layout
   - Lines affected: ~35 lines
   - Effort: MEDIUM (structural change)

🔧 frontend/src/app/layout.tsx
   - May need navbar adjustments
   - Lines affected: ~10 lines (if needed)
   - Effort: LOW
```

#### Home Components (Modify Existing)
```
🔧 frontend/src/components/home/Hero.tsx
   - Integration with Flash Sale countdown
   - May need minor styling adjustments
   - Lines affected: ~20 lines
   - Effort: LOW

🔧 frontend/src/components/home/FeaturedProducts.tsx
   - Extract from HomeLanes wrapper
   - Make it standalone section
   - Integrate with ProductCategoryTabs
   - Lines affected: ~50 lines
   - Effort: MEDIUM

🔧 frontend/src/components/home/ServicesOverview.tsx
   - Extract from HomeLanes wrapper
   - Change from 3-col to 4-col grid
   - Add section title styling
   - Lines affected: ~30 lines
   - Effort: MEDIUM

🔧 frontend/src/components/home/Portfolio.tsx
   - Rename or refactor as SoftwareSection
   - Expand with more detailed cards
   - Add FeatureIconsRow component
   - Lines affected: ~60 lines
   - Effort: HIGH

🔧 frontend/src/components/home/CustomerReviews.tsx
   - Add ReviewStatsCard integration
   - Adjust layout for stats + marquee side-by-side
   - Lines affected: ~40 lines
   - Effort: MEDIUM

🔧 frontend/src/components/home/LeadCapture.tsx
   - Add AI illustration
   - Update color scheme (purple)
   - Add feature badges/checkmarks
   - Side-by-side layout on desktop
   - Lines affected: ~80 lines
   - Effort: HIGH

🔧 frontend/src/components/home/ContactSection.tsx
   - Restructure for new layout
   - May simplify (move contact info to banner)
   - Lines affected: ~40 lines
   - Effort: MEDIUM

🔧 frontend/src/components/home/TrustBadges.tsx
   - Expand to 6 cards (WhyChooseUsCards replacement)
   - Update styling to card-based layout
   - Lines affected: ~50 lines
   - Effort: HIGH

🔧 frontend/src/components/layout/Footer.tsx
   - Restructure sections
   - Improve spacing and organization
   - Add section headers
   - Lines affected: ~100 lines
   - Effort: MEDIUM

🔧 frontend/src/components/layout/Navbar.tsx
   - May need styling adjustments
   - Lines affected: ~10 lines (if needed)
   - Effort: LOW

🔧 frontend/src/components/layout/MobileBottomNav.tsx
   - May need updates for new routes
   - Lines affected: ~10 lines (if needed)
   - Effort: LOW

🔧 frontend/src/app/globals.css
   - Add new utility classes
   - Update component-specific styles
   - Lines affected: ~50 lines
   - Effort: LOW
```

---

## ➕ FILES TO CREATE (9-10 new files)

### New Home Components
```
✨ frontend/src/components/home/FlashSaleSection.tsx
   - Prominent flash sale section with countdown
   - Product grid (4 items)
   - "View All Flash Sales" button
   - Size: ~200-250 lines
   - Complexity: HIGH
   - Dependencies: ProductCard, CountdownTimer, PromoSlider
   - Effort: 6 days

✨ frontend/src/components/home/ProductCategoryTabs.tsx
   - Filter tabs for featured products
   - Categories: All | Mobile | Laptop | Audio | Smart Watch | Camera
   - State management for active filter
   - Size: ~100-150 lines
   - Complexity: MEDIUM
   - Dependencies: None (standalone)
   - Effort: 3 days

✨ frontend/src/components/home/ReviewStatsCard.tsx
   - Display review statistics
   - 4.8 / 5 rating
   - 10,000+ verified buyers
   - 25,000+ products
   - 2,847 total reviews
   - 99.2% satisfaction rate
   - Size: ~80-120 lines
   - Complexity: LOW
   - Dependencies: None
   - Effort: 2 days

✨ frontend/src/components/home/SoftwareCard.tsx
   - Card for software solutions
   - Image, title, description
   - "বিস্তারিত দেখুন" link
   - Same styling as GlassCard
   - Size: ~100-150 lines
   - Complexity: MEDIUM
   - Dependencies: GlassCard, Image, Link
   - Effort: 2 days

✨ frontend/src/components/home/FeatureIconsRow.tsx
   - Horizontal row of 6-8 feature icons
   - Icons: Demo, Consultation, Integration, Support, etc.
   - Responsive grid
   - Size: ~100-120 lines
   - Complexity: LOW
   - Dependencies: None
   - Effort: 2 days

✨ frontend/src/components/home/WhyChooseUsCards.tsx
   - 6 trust/benefit cards
   - 2 rows × 3 columns layout
   - Icons + title + description
   - Size: ~150-180 lines
   - Complexity: MEDIUM
   - Dependencies: GlassCard
   - Effort: 3 days

✨ frontend/src/components/home/BrandPartnersSection.tsx
   - Wrapper around ClientLogos
   - Add section title "আমাদের ব্র্যান্ড পার্টনার"
   - "See all" link
   - Pagination dots
   - Size: ~80-120 lines
   - Complexity: LOW
   - Dependencies: ClientLogos, PromoSlider
   - Effort: 1 day

✨ frontend/src/components/home/AiIllustration.tsx
   - Decorative SVG or image for AI section
   - Shows AI robot/chat interface
   - Responsive sizing
   - Size: ~80-120 lines
   - Complexity: LOW
   - Dependencies: Image or SVG component
   - Effort: 1 day

✨ frontend/src/components/home/ContactCTABanner.tsx
   - Floating/sticky contact bar
   - Phone number
   - Social icons (WhatsApp, Messenger, YouTube, Facebook)
   - "যোগাযোগ করুন" header
   - Size: ~100-150 lines
   - Complexity: MEDIUM
   - Dependencies: Icons, Link
   - Effort: 2 days
```

### Possibly New Type/Config Files
```
📝 frontend/src/types/index.ts (MAYBE)
   - Add new types if needed (ProductCategory, ReviewStats, etc.)
   - Effort: LOW (if needed)

📝 frontend/src/lib/homepageContent.ts (MAYBE)
   - Add new admin settings for sections
   - Effort: LOW (if needed)
```

---

## 🔄 Import/Export Changes Required

### In `frontend/src/app/page.tsx`

**Remove Imports:**
```typescript
import LaneSwitcher from "@/components/home/LaneSwitcher";
import HomeLanes from "@/components/home/HomeLanes";
```

**Add Imports:**
```typescript
import FlashSaleSection from "@/components/home/FlashSaleSection";
import ProductCategoryTabs from "@/components/home/ProductCategoryTabs";
import BrandPartnersSection from "@/components/home/BrandPartnersSection";
import WhyChooseUsCards from "@/components/home/WhyChooseUsCards";
import ReviewStatsCard from "@/components/home/ReviewStatsCard";
import FeatureIconsRow from "@/components/home/FeatureIconsRow";
import ContactCTABanner from "@/components/home/ContactCTABanner";
import AiIllustration from "@/components/home/AiIllustration";
// Update existing dynamic imports paths if moved
```

---

## 📊 Component Dependency Tree

```
HomePage (app/page.tsx)
│
├─ Hero.tsx [MODIFY]
│  └─ (no changes to dependencies)
│
├─ FlashSaleSection.tsx [NEW]
│  ├─ ProductCard [EXISTING]
│  ├─ CountdownTimer [EXISTING]
│  └─ PromoSlider [EXISTING]
│
├─ FeaturedProducts.tsx [MODIFY]
│  ├─ ProductCategoryTabs [NEW]
│  ├─ ProductCard [EXISTING]
│  └─ CountdownTimer [EXISTING]
│
├─ ServicesOverview.tsx [MODIFY]
│  └─ GlassCard [EXISTING]
│
├─ Portfolio → SoftwareSection [MODIFY]
│  ├─ SoftwareCard [NEW]
│  ├─ FeatureIconsRow [NEW]
│  └─ PromoSlider [EXISTING]
│
├─ BrandPartnersSection.tsx [NEW]
│  ├─ ClientLogos [EXISTING]
│  └─ PromoSlider [EXISTING]
│
├─ WhyChooseUsCards.tsx [NEW]
│  └─ GlassCard [EXISTING]
│
├─ CustomerReviews.tsx [MODIFY]
│  ├─ ReviewStatsCard [NEW]
│  ├─ PromoSlider [EXISTING - marquee]
│  └─ GlassCard [EXISTING]
│
├─ FAQ.tsx [MINIMAL CHANGES]
│  └─ Accordion [EXISTING]
│
├─ LeadCapture.tsx [MODIFY]
│  └─ AiIllustration [NEW]
│
├─ ContactCTABanner.tsx [NEW]
│  └─ (standalone)
│
└─ Footer.tsx [MODIFY]
   └─ (no dependency changes)
```

---

## 🎨 Styling/CSS Changes

### Files Affected
```
🎨 frontend/src/app/globals.css
   - Add `.section-title` variants if not present
   - Add `.feature-icon-row` grid utilities
   - Add `.why-choose-us-grid` responsive grid
   - Add `.review-stats-card` styling
   - Update colors for purple (LeadCapture) sections
   - Add responsive breakpoints for category tabs
```

### New CSS Classes to Add
```css
/* Flash Sale Section */
.flash-sale-section { }
.flash-sale-header { }
.flash-sale-grid { }

/* Category Tabs */
.category-tabs { }
.category-tab { }
.category-tab--active { }

/* Review Stats */
.review-stats-card { }
.review-stat-item { }
.review-stat-number { }
.review-stat-label { }

/* Software Cards */
.software-card { }
.software-card-image { }

/* Feature Icons */
.feature-icons-row { }
.feature-icon { }

/* Why Choose Us */
.why-choose-us-grid { }
.why-choose-us-card { }

/* AI Section */
.ai-section-container { }
.ai-illustration { }
.ai-form-wrapper { }

/* Contact Banner */
.contact-cta-banner { }
.contact-cta-social-links { }
```

---

## 🧪 Testing Checklist for Each Component

### FlashSaleSection
- [ ] Countdown timer displays correctly
- [ ] Timer updates in real-time
- [ ] Product grid displays 4 items
- [ ] "View All" button links to `/products?flash_sale=true`
- [ ] Responsive on mobile (2 cols), tablet (2-4 cols), desktop (4 cols)
- [ ] No console errors
- [ ] Loading state (skeleton) works

### ProductCategoryTabs
- [ ] All category tabs render
- [ ] Clicking tab filters products
- [ ] Active tab styling works
- [ ] Responsive on mobile (scroll if many tabs)
- [ ] Tab state persists on scroll

### ReviewStatsCard
- [ ] All 5 stats display
- [ ] Numbers format correctly (10,000+, 99.2%, etc.)
- [ ] Icons/styling matches target
- [ ] Responsive on all breakpoints

### SoftwareCard
- [ ] Image displays correctly
- [ ] Title and description visible
- [ ] "বিস্তারিত দেখুন" link functional
- [ ] Hover effects work
- [ ] Responsive on all breakpoints

### FeatureIconsRow
- [ ] All 6-8 icons display
- [ ] Icons responsive (stack on mobile, grid on desktop)
- [ ] Labels centered below icons
- [ ] No overflow on small screens

### WhyChooseUsCards
- [ ] 6 cards render in 2×3 grid
- [ ] On mobile: stack into single column
- [ ] Card styling consistent
- [ ] No text truncation issues

### BrandPartnersSection
- [ ] Logo slider works
- [ ] Pagination dots display
- [ ] Logos load correctly
- [ ] Responsive swipe/drag on mobile

### AiIllustration
- [ ] Image/SVG displays on desktop
- [ ] Hides gracefully on mobile
- [ ] No layout shift
- [ ] Alt text present (if image)

### ContactCTABanner
- [ ] Sticky positioning works
- [ ] Phone number clickable
- [ ] Social icons link correctly
- [ ] Mobile-friendly tap targets (44×44px)
- [ ] Z-index doesn't overlap content

---

## 🔗 Deep Linking Strategy

Since we're removing the `?lane=` URL parameters, implement anchor-based deep linking:

```typescript
// New anchor IDs to add:
<section id="flash-sale" />
<section id="featured-products" />
<section id="services" />
<section id="software" />
<section id="brand-partners" />
<section id="why-choose-us" />
<section id="reviews" />
<section id="faq" />
<section id="consultation" />
<section id="contact" />

// Update LaneSwitcher removal with smooth scroll navigation:
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
```

---

## 🚀 Deployment Phases

### Phase 1: Hero & Flash Sale
**Files Modified:** Hero.tsx, page.tsx  
**Files Created:** FlashSaleSection.tsx  
**Duration:** 6 days

### Phase 2: Products & Tabs
**Files Modified:** FeaturedProducts.tsx, page.tsx  
**Files Created:** ProductCategoryTabs.tsx  
**Duration:** 3 days

### Phase 3: Services
**Files Modified:** ServicesOverview.tsx, page.tsx  
**Duration:** 3 days

### Phase 4: Software
**Files Modified:** Portfolio.tsx, page.tsx  
**Files Created:** SoftwareCard.tsx, FeatureIconsRow.tsx  
**Duration:** 3 days

### Phase 5: Brand Partners
**Files Created:** BrandPartnersSection.tsx  
**Duration:** 1 day

### Phase 6: Why Choose Us
**Files Modified:** TrustBadges.tsx → WhyChooseUsCards.tsx, page.tsx  
**Files Created:** WhyChooseUsCards.tsx  
**Duration:** 3 days

### Phase 7: Reviews & Stats
**Files Modified:** CustomerReviews.tsx, page.tsx  
**Files Created:** ReviewStatsCard.tsx  
**Duration:** 2 days

### Phase 8: AI Consultation
**Files Modified:** LeadCapture.tsx, page.tsx  
**Files Created:** AiIllustration.tsx  
**Duration:** 2 days

### Phase 9: Contact & Footer
**Files Modified:** ContactSection.tsx, Footer.tsx, page.tsx  
**Files Created:** ContactCTABanner.tsx  
**Duration:** 2 days

### Phase 10: Cleanup
**Files Deleted:** LaneSwitcher.tsx, HomeLanes.tsx  
**Duration:** 1 day

### Phase 11: QA & Testing
**All files tested**  
**Duration:** 4 days

---

## ⚠️ Common Pitfalls & Solutions

| Pitfall | Prevention |
|---------|-----------|
| Forget to update page.tsx imports | Use checklist, run build after each phase |
| CSS class conflicts | Use BEM naming, namespace new classes |
| Hydration errors | Ensure server/client render match, check dynamic imports |
| Responsive grid breaks | Test all breakpoints, use CSS Grid wisely |
| Image optimization missed | Use Next.js Image component, add placeholder/blur |
| Type errors in new components | Use TypeScript strict mode, export proper types |
| LaneSwitcher deep links break | Implement anchor-based navigation |
| Performance regression | Run Lighthouse before/after, profile with DevTools |
| Dark mode compatibility | Test all new components in dark mode |
| Accessibility overlook | Run axe audit, test keyboard navigation |

---

## 📋 Pre-Commit Checklist

Before committing each phase:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build

# Visual inspection
# - Open http://localhost:3000
# - Test on mobile (Chrome DevTools)
# - Test on tablet
# - Test dark mode (F12 → Rendering → Emulate CSS media feature: prefers-color-scheme)

# Accessibility
# - Install axe DevTools Chrome extension
# - Run scan on http://localhost:3000
# - Fix any violations

# Performance
# - Open DevTools → Lighthouse
# - Run audit for mobile & desktop
# - Verify no performance regression
```

**Git Commit Message Format:**
```
feat: Phase X - [Phase Name]

- Added [new component]
- Modified [existing component]
- Removed [deprecated component]

Resolves: #[issue-number]
```

---

**Guide Version:** 1.0  
**Last Updated:** 2026-08-03  
**Ready for:** Implementation
