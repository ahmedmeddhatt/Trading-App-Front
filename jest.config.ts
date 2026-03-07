import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  testEnvironmentOptions: {
    // Use Node-compatible export conditions so MSW resolves its CJS builds
    // instead of the browser ESM builds that jsdom would normally select.
    customExportConditions: [""],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/*.spec.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/mocks/**",
    "!src/app/layout.tsx",
  ],
};

export default createJestConfig(config);
