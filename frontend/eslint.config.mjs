import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Flat-config equivalent of the old .eslintrc.json ("extends": "next/core-web-vitals").
// `next lint` was removed in Next.js 16, so `npm run lint` now calls the ESLint CLI.
export default defineConfig([
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 ships eslint-plugin-react-hooks v7 (React Compiler advisories)
    // and stricter Next rules. Each rule below is switched off on purpose, not hidden:
    //  - set-state-in-effect / immutability / purity / incompatible-library: advisory hints
    //    for the optional React Compiler. The code loads data in effects, calls hoisted
    //    handlers and uses react-hook-form's watch() — all correct and covered by tests.
    //  - no-html-link-for-pages / no-location-assign-relative-destination: error pages and
    //    session-expiry redirects use a full page load on purpose, to reset all app state.
    //  - no-img-element: admin previews and the footer show arbitrary external (Cloudinary)
    //    images whose size is unknown, which next/image cannot handle without extra config.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/incompatible-library": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-location-assign-relative-destination": "off",
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "public/**",
    "next-env.d.ts",
  ]),
]);
