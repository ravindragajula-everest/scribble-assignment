import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173"
  },
  webServer: [
    {
      command: "npm run dev --prefix ../backend",
      port: 3001,
      reuseExistingServer: true,
      timeout: 30000
    },
    {
      command: "npm run dev",
      port: 5173,
      reuseExistingServer: true,
      timeout: 30000
    }
  ]
});
