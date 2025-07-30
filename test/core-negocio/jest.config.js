// jest.config.js (en la raíz del proyecto gateway)
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.test\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],

  // Configuración para salida más limpia
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
};
