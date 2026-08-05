const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // swiper ships ESM-only (.mjs) with no CJS build, which Jest's default
    // node_modules transform-skip can't parse ("Cannot use import statement
    // outside a module"). next/jest merges rather than replaces its own
    // transformIgnorePatterns, so a negative-lookahead override there never
    // actually takes effect — redirecting the import itself is the fix that
    // works. See test-mocks/swiperReact.tsx for what the stand-in renders.
    "^swiper/react$": "<rootDir>/test-mocks/swiperReact.tsx",
    "^swiper/modules$": "<rootDir>/test-mocks/swiperModules.ts",
    // "swiper/css" and "swiper/css/pagination" are exports-map subpaths —
    // the raw specifier string has no .css suffix, so next/jest's built-in
    // `\.(css|sass|scss)$` mapping never matches it; needs an explicit one.
    "^swiper/css.*$": "<rootDir>/test-mocks/styleMock.js",
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/**/__tests__/**",
  ],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/__tests__/**/*.spec.{js,jsx,ts,tsx}",
  ],
};

module.exports = createJestConfig(customJestConfig);
