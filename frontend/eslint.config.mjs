import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Flat-config equivalent of the old .eslintrc.json ("extends": "next/core-web-vitals").
// `next lint` was removed in Next.js 16, so `npm run lint` now calls the ESLint CLI.
export default defineConfig([
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 ships eslint-plugin-react-hooks v7, which adds
    // React Compiler rules that did not exist under Next 14, and now applies
    // no-html-link-for-pages to the App Router (the plain <a> tags it flags in
    // error boundaries are intentional full reloads). Kept as warnings so the
    // upgrade does not change lint gating; fix them gradually.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "@next/next/no-html-link-for-pages": "warn",
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
