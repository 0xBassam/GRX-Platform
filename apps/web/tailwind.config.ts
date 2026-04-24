import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        arabic: ['"Noto Naskh Arabic"', '"Noto Sans Arabic"', "serif"],
      },
      colors: {
        brand: {
          50: "#f3f7ff",
          500: "#3558e5",
          700: "#243fa3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
