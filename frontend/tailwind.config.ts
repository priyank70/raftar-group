import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F172A",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        accent: {
          DEFAULT: "#14B8A6",
          light: "#2DD4BF",
          dark: "#0D9488",
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        background: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        muted: "#64748B",
        success: {
          DEFAULT: "#16A34A",
          light: "#22C55E",
          bg: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FCD34D",
          bg: "#FFFBEB",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#F87171",
          bg: "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
        "shimmer": "shimmer 2s linear infinite",
        "bounce-subtle": "bounceSubtle 0.6s ease-in-out",
        "counter": "counter 1s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
        "hero-gradient": "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0D9488 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
        "accent-gradient": "linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)",
      },
      boxShadow: {
        "card": "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 8px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.12)",
        "glass": "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
        "glow": "0 0 20px rgba(20,184,166,0.3)",
        "glow-strong": "0 0 40px rgba(20,184,166,0.5)",
        "inner-glow": "inset 0 2px 4px rgba(20,184,166,0.15)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "xl2": "1rem",
        "xl3": "1.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
