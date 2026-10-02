import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the GitHub Pages repo path: https://<user>.github.io/wpr-city-budget/
// The data fetch uses BASE_URL, so this is the only place the repo name appears.
export default defineConfig({
  plugins: [react()],
  base: "/wpr-city-budget/",
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: a data or copy update doesn't invalidate the libraries.
        manualChunks(id) {
          if (/node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
          if (/node_modules[\/](recharts|d3-[^\/]+|victory-vendor|react-smooth)[\/]/.test(id)) return "recharts";
        },
      },
    },
  },
});
