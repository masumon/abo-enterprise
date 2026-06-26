import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f0fe",
          100: "#c5d8fb",
          200: "#9dbef8",
          300: "#6fa3f4",
          400: "#2979d4",
          500: "#1e5ba8",
          600: "#1565c0",
          700: "#0d47a1",
          800: "#093782",
          900: "#062563",
        },
        accent: {
          50: "#fce4ec",
          100: "#f8bbd0",
          200: "#f48fb1",
          300: "#f06292",
          400: "#ec407a",
          500: "#e91e63",
          600: "#c2185b",
          700: "#ad1457",
          800: "#880e4f",
          900: "#560027",
        },
      },
      fontFamily: {
        sans: ["Inter", "Hind Siliguri", "system-ui", "sans-serif"],
        bangla: ["Hind Siliguri", "SolaimanLipi", "sans-serif"],
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        pulse: "pulse 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
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
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(30,91,168,0.3)",
        card: "0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)",
        "card-hover": "0 10px 25px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
