/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",

  roots: ["<rootDir>/src"],

  testMatch: [
    "**/__tests__/**/*.test.ts",
  ],

  setupFiles: [
    "<rootDir>/src/__tests__/set-env.ts",
  ],

  setupFilesAfterEnv: [
    "<rootDir>/src/__tests__/setup.ts",
  ],

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },

  clearMocks: true,
  restoreMocks: true,
  testTimeout: 120000,

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/types/**",
    "!src/__tests__/**",
  ],

  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "html",
    "lcov",
  ],
};