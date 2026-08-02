# Homepage Design Rules

## Objective

Redesign the homepage to match the UI and UX of the screenshots in:

- docs/target_homepage/

using the existing production codebase.

Current homepage screenshots are stored in:

- docs/current_homepage/

## Rules

### 1. Pixel Perfect

- Match the target screenshots as closely as possible.
- Keep spacing, alignment, border radius, shadows, typography, colors and sizing consistent.

### 2. Mobile First

- Design for mobile viewport first.
- Preserve responsive behavior for tablet and desktop.

### 3. Reuse Existing Code

- Reuse existing components whenever possible.
- Refactor instead of rewriting when practical.

### 4. Do Not Break Existing Features

- Keep existing API integrations.
- Keep backend logic unchanged unless required.
- Preserve routing and functionality.

### 5. CMS Driven

- All editable text, images, banners, buttons and sections must come from the CMS/admin panel where supported.
- No hardcoded production content.

### 6. Production Safe

- No placeholder data.
- No demo content.
- No fake API.
- No temporary hacks.

### 7. Performance

- Keep lazy loading.
- Optimize images.
- Avoid unnecessary re-renders.
- Maintain Lighthouse performance.

### 8. Accessibility

- Proper semantic HTML.
- Keyboard accessible.
- Sufficient color contrast.
- ARIA labels where needed.

### 9. Code Quality

- Keep TypeScript types correct.
- Follow existing project architecture.
- Remove duplicated code.
- Keep components modular.

### 10. Implementation Strategy

Do not redesign everything at once.

Implement section by section:

1. Header
2. Hero
3. Search
4. Category Cards
5. Feature Icons
6. Flash Sale
7. Featured Products
8. Services
9. Software
10. Reviews
11. FAQ
12. Consultation
13. Contact
14. Footer

After each section:

- Compare with the target screenshots.
- Verify responsiveness.
- Ensure no regression.

### 11. Acceptance Criteria

The implementation is complete only when:

- Target UI is visually matched.
- Existing functionality works.
- No console errors.
- No TypeScript errors.
- No broken layout.
- Production build succeeds.