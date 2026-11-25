import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/emotion-ai/",
  plugins: [react()],
  test: { environment: "jsdom" },
});
