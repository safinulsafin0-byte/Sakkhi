import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-literata)", "Georgia", "serif"],
        sans: ["var(--font-source-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        bengali: ["var(--font-hind-siliguri)", "sans-serif"],
      },
      colors: {
        paper: {
          DEFAULT: "#fbf9f5",
          card: "#ffffff",
          dark: "#f3ede2",
        },
        ink: {
          DEFAULT: "#1f2421",
          muted: "#525c56",
          faint: "#8c9690",
        },
        terracotta: {
          DEFAULT: "#b84c26",
          hover: "#9e3f1e",
          soft: "#f9ede8",
        },
        forest: {
          DEFAULT: "#2d6a4f",
          soft: "#edf6f1",
        },
        amber: {
          DEFAULT: "#b45309",
          soft: "#fef3c7",
        },
        border: {
          soft: "#e6dfd5",
        },
      },
      boxShadow: {
        receipt: "0 4px 12px -2px rgba(31, 36, 33, 0.08), 0 2px 4px -1px rgba(31, 36, 33, 0.04)",
        card: "0 2px 8px -2px rgba(31, 36, 33, 0.05), 0 1px 3px -1px rgba(31, 36, 33, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
