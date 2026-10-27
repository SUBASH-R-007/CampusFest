import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  base:
    mode === "pages"
      ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] || "CampusFest"}/`
      : "/",
  define: {
    "import.meta.env.VITE_STATIC_PREVIEW": JSON.stringify(mode === "pages"),
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api": process.env.CAMPUSFEST_API_TARGET || "http://127.0.0.1:8000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.js",
  },
}));
