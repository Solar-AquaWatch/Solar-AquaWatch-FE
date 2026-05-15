/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        surface: "#f6f8fb",
        aqua: "#0e7490",
      },
      boxShadow: {
        panel: "0 14px 34px rgba(23, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};
