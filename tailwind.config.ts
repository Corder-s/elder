import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // Master Purple Theme strictly from prompt
        brand: {
          50: "#FAF8FF",
          100: "#F3E8FF", // Light Purple
          200: "#E9D5FF",
          300: "#D8B4FE",
          400: "#C084FC",
          500: "#A855F7",
          600: "#8B5CF6", // Secondary Purple
          700: "#6D28D9", // Primary Purple
          800: "#5B21B6",
          900: "#4C1D95", // Deep Purple
          950: "#2E1065",
        },
        primary: {
          DEFAULT: "#6D28D9",
          foreground: "#FFFFFF",
          deep: "#4C1D95",
          light: "#F3E8FF",
          secondary: "#8B5CF6",
        },
        app: {
          bg: "#FAF8FF",
          card: "#FFFFFF",
          text: "#17133A",
          muted: "#686581",
          border: "#E8E1F5",
          success: "#16A34A",
          warning: "#F59E0B",
          danger: "#E11D48",
          info: "#0EA5E9",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(109, 40, 217, 0.08)",
        card: "0 2px 12px 0 rgba(109, 40, 217, 0.05)",
        floating: "0 10px 30px -5px rgba(109, 40, 217, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
