module.exports = {
    projects: [
      {
        displayName: 'server',
        testMatch: ['<rootDir>/server/**/*.test.js'],
        testEnvironment: 'node',
        setupFilesAfterEnv: ['<rootDir>/tests/setup/server.js'],
      },
      {
        displayName: 'web',
        testMatch: ['<rootDir>/web/src/**/*.test.{js,jsx,ts,tsx}'],
        testEnvironment: 'jsdom',
        setupFilesAfterEnv: ['<rootDir>/tests/setup/web.js'],
        moduleNameMapping: {
          '^@/(.*)$': '<rootDir>/web/src/$1',
          '^@shared/(.*)$': '<rootDir>/shared/$1',
        },
      },
      {
        displayName: 'desktop',
        testMatch: ['<rootDir>/desktop/**/*.test.js'],
        testEnvironment: 'node',
        setupFilesAfterEnv: ['<rootDir>/tests/setup/desktop.js'],
      },
      {
        displayName: 'shared',
        testMatch: ['<rootDir>/shared/**/*.test.js'],
        testEnvironment: 'node',
      },
    ],
    collectCoverageFrom: [
      '**/src/**/*.{js,jsx,ts,tsx}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/build/**',
      '!**/*.d.ts',
    ],
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    watchPlugins: [
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname',
    ],
  };