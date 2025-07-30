module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/test/**/*.test.ts', '**/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  testPathIgnorePatterns: ['<rootDir>/test/utils/', '<rootDir>/node_modules/'],
  verbose: false,
  silent: false,
  reporters: [
    [
      'default',
      {
        summaryThreshold: 0,
      },
    ],
  ],
  // No mostrar stack traces largos
  noStackTrace: false,
  // Solo mostrar primera línea del error
  errorOnDeprecated: false,
  testTimeout: 60000,
};
