/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#0e0e10",
        surface: "#18181b",
        border:  "#27272a",
        muted:   "#71717a",
        text:    "#e4e4e7",
        subtle:  "#a1a1aa",
        accent:  "#6366f1",
        "accent-hover": "#4f46e5",
        success: "#22c55e",
        warning: "#f59e0b",
        danger:  "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
