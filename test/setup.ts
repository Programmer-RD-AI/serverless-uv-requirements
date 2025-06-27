// Jest setup file for global test configuration

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.exit with proper typing
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`Process.exit called with code ${code}`);
});

// Set test timeout
jest.setTimeout(10000);
