import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // "Nil & Marigold" — the artifact's palette. nil is Bengali indigo,
        // gada the marigold sold at the shop door. The scale is anchored so the
        // steps already used across the app land on the artifact's own tokens:
        // brand-600 = nil #1E2B6B, brand-500 = nil-lift #35479B,
        // brand-50 = nil-wash #E7EAF6. Nothing had to change at a call site.
        brand: {
          50: "#e7eaf6",
          100: "#cfd6ec",
          200: "#a9b5dc",
          300: "#7c8cc7",
          400: "#5568b0",
          500: "#35479b",
          600: "#1e2b6b",
          700: "#182357",
          800: "#131c45",
          900: "#0e1533",
        },
        // accent-500 = gada #E4A11B, accent-700 = gada-deep #A87008,
        // accent-50 = gada-wash #FBF0D8.
        accent: {
          50: "#fbf0d8",
          100: "#f6e0ae",
          200: "#f0cc7c",
          300: "#ebb84a",
          400: "#e7ac2e",
          500: "#e4a11b",
          600: "#c08610",
          700: "#a87008",
          800: "#855806",
          900: "#614004",
        },
      },
      fontFamily: {
        // The artifact's three faces. Body is the system stack so Latin text
        // costs no webfont; Bengali still resolves to a real Bengali face
        // rather than falling back, which was the rule the artifact set.
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans Bengali", "Hind Siliguri", "sans-serif"],
        display: ["ui-serif", "Charter", "Bitstream Charter", "Iowan Old Style", "Source Serif 4", "Georgia", "serif"],
        mono: ["ui-monospace", "SF Mono", "Cascadia Mono", "Roboto Mono", "Menlo", "monospace"],
        bangla: ["Noto Sans Bengali", "Hind Siliguri", "SolaimanLipi", "sans-serif"],
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.25s ease-out both",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "slide-right": "slideRight 0.35s cubic-bezier(0.16,1,0.3,1) both",
        // Welcome experience animations
        "blur-in-up": "blurInUp 0.55s cubic-bezier(0.16,1,0.3,1) both",
        "fade-up": "fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both",
        "glow-breathe": "glowBreathe 3s ease-in-out infinite",
        "orb-drift-1": "orbDrift1 16s ease-in-out infinite",
        "orb-drift-2": "orbDrift2 20s ease-in-out infinite",
        "orb-drift-3": "orbDrift3 13s ease-in-out infinite",
        "shimmer-slide": "shimmerSlide 2.8s linear infinite",
        "welcome-exit": "welcomeExit 0.55s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px) scale(0.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        // Welcome experience keyframes
        blurInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)", filter: "blur(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowBreathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.1)" },
        },
        orbDrift1: {
          "0%, 100%": { transform: "translate(0px, 0px)" },
          "30%": { transform: "translate(45px, -28px)" },
          "65%": { transform: "translate(-22px, 18px)" },
        },
        orbDrift2: {
          "0%, 100%": { transform: "translate(0px, 0px)" },
          "40%": { transform: "translate(-32px, 24px)" },
          "72%": { transform: "translate(22px, -18px)" },
        },
        orbDrift3: {
          "0%, 100%": { transform: "translate(0px, 0px)" },
          "50%": { transform: "translate(18px, -32px)" },
        },
        shimmerSlide: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        welcomeExit: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(1.015)" },
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(30,91,168,0.3)",
        card: "0 4px 24px rgba(30,91,168,0.06), 0 1px 4px rgba(0,0,0,0.04)",
        "card-hover": "0 12px 40px rgba(30,91,168,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        glass: "0 8px 32px rgba(30,91,168,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        "glass-strong": "0 16px 48px rgba(30,91,168,0.14), 0 4px 16px rgba(0,0,0,0.06)",
        admin: "0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      },
      backdropBlur: {
        xs: "2px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
      },
    },
  },
  plugins: [],
};

export default config;
