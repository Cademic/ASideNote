import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(process.env.ANALYZE
      ? [visualizer({ open: true, filename: "dist/stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
  optimizeDeps: {
    include: ["@microsoft/signalr"],
  },
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/hubs": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: "es2020",
    sourcemap: mode !== "production",
    rollupOptions: {
      output: {
        // Checked in order, so shared low-level deps (e.g. react/jsx-runtime) resolve to
        // "react" first instead of getting trapped inside whichever vendor chunk happens to
        // import them first — that trap forces every consumer, including the eager entry, to
        // fetch the whole trapping chunk just for a few shared bytes.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router-dom|scheduler)\//.test(id)) return "react";
          if (/node_modules\/(@tiptap|prosemirror-)/.test(id)) return "tiptap";
          if (/node_modules\/fabric\//.test(id)) return "fabric";
          if (/node_modules\/(axios|lucide-react|react-draggable)\//.test(id)) return "vendor";
          return undefined;
        },
      },
    },
  },
}));
