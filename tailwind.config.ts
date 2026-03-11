import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aviation: {
          900: '#0B1021', // Deep techy purple/blue background
          800: '#141830', // Panel background
          700: '#1F254B', // Elevated panel
          600: '#3A447E', // Border highlights
          400: '#697AE0', // Active elements
        },
        radar: {
          green: '#4AF2A1', // Success / radar sweeps
          red: '#F24A71',   // Failed metrics
          yellow: '#F2D34A' // Warnings
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
