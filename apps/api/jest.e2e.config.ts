import { Config } from 'jest';

const config: Config = {
  displayName: 'E2E Tests',
  testMatch: ['**/*.e2e-spec.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  coverageDirectory: './coverage/e2e',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.(t|j)s',
    '!src/**/*.dto.(t|j)s',
    '!src/main.ts',
  ],
  testTimeout: 30000, // 30 second timeout for DB operations
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  globalSetup: '<rootDir>/test/setup.ts',
  globalTeardown: '<rootDir>/test/setup.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@janagana/database$': '<rootDir>/../../packages/database/src',
    '^@janagana/types$': '<rootDir>/../../packages/types/src',
  },
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};

export default config;
