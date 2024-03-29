// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fontFamily, screens } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      xs: "320px",
      ...screens,
      "3xl": "2160px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        os: ["Open Sans", "sans-serif"],
        logo: ["Francois One", "sans-serif"],
        timer: ["Share Tech Mono", "monospace"],
      },
      fontSize: {
        "2xs": [
          "0.55rem",
          {
            lineHeight: "1rem",
          },
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = config;
