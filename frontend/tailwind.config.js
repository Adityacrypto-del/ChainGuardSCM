/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:       "#0a0a0a",
        surface:  "#111111",
        surface2: "#1a1a1a",
        surface3: "#222222",
        border:   "#2a2a2a",
        border2:  "#333333",
        primary:  "#6366f1",
        cyan:     "#06b6d4",
        success:  "#22c55e",
        warning:  "#f59e0b",
        danger:   "#ef4444",
        muted:    "#71717a",
        subtle:   "#3f3f46",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-card":   "linear-gradient(135deg, #1a1a1a 0%, #111111 100%)",
        "gradient-primary":"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        "gradient-success":"linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
        "gradient-danger": "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        "gradient-warning":"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "gradient-cyan":   "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-lg": "0 4px 16px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
        "glow-primary": "0 0 20px rgba(99,102,241,0.25)",
        "glow-success": "0 0 20px rgba(34,197,94,0.2)",
        "glow-danger":  "0 0 20px rgba(239,68,68,0.2)",
        "glow-cyan":    "0 0 20px rgba(6,182,212,0.2)",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "slide-in":   "slideIn 0.25s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "shimmer":    "shimmer 2s linear infinite",
        "count-up":   "countUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn:   { from:{opacity:0}, to:{opacity:1} },
        slideUp:  { from:{opacity:0,transform:"translateY(8px)"}, to:{opacity:1,transform:"translateY(0)"} },
        slideIn:  { from:{opacity:0,transform:"translateX(-8px)"}, to:{opacity:1,transform:"translateX(0)"} },
        shimmer:  { "0%":{backgroundPosition:"-200% 0"}, "100%":{backgroundPosition:"200% 0"} },
        countUp:  { from:{opacity:0,transform:"translateY(4px)"}, to:{opacity:1,transform:"translateY(0)"} },
      },
    },
  },
  plugins: [],
};
