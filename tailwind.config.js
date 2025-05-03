module.exports = {
  content: ["./blog/templates/**/*.html", "./blog/static/**/*.js"],
  theme: {
    extend: {
      colors: {
        "brand-indigo": "#4F46E5",
        "brand-blue": "#2563EB",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
      },
    },
  },
  plugins: [require("@tailwindcss/aspect-ratio")],
};
