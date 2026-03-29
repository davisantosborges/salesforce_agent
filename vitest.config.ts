import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    setupFiles: ["dotenv/config"],
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/create-school.ts",
        "src/verify-school.ts",
        "src/test-auth.ts",
      ],
    },
  },
});
