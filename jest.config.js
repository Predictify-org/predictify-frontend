const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
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
    "^next/navigation$": "<rootDir>/__mocks__/next/navigation.js",
    "^next/router$": "<rootDir>/__mocks__/next/router.js",
  };
  return resolvedConfig;
};
