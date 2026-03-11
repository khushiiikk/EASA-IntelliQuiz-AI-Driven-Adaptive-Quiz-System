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
          900: '#040b16', // Deepest navy (background)
          800: '#0a192f', // Dark navy (panels)
          700: '#112240', // Lighter navy (elevated)
          600: '#233554', // Slate navy (borders)
          400: '#64ffda', // Cyan/teal (active text/accents)
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
