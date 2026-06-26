const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  // Use node environment for unit tests (config, lib, api)
  // Component tests will run in a separate command with jsdom
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/*.test.{ts,tsx}",
  ],
};

module.exports = async () => {
  const makeConfig = createJestConfig(config);
  const resolvedConfig = await makeConfig();
  resolvedConfig.moduleNameMapper = {
    ...resolvedConfig.moduleNameMapper,
    "^@/(.*)$": "<rootDir>/$1",
    "^\\./app/(.*)$": "<rootDir>/app/$1",
  };
  return resolvedConfig;
};
