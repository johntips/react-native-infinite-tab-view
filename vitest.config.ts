import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/__tests__/**", "src/index.tsx"],
    },
  },
  resolve: {
    extensions: [".web.tsx", ".web.jsx", ".web.js", ".tsx", ".ts", ".js"],
    alias: {
      "react-native": "react-native-web",
    },
  },
  esbuild: {
    jsx: "automatic",
  },
});
