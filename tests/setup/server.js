const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.DB_URL = mongoServer.getUri();
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global test utilities
global.testUtils = {
  createMockSession: () => ({
    id: 'test-session-id',
    hostId: 'test-host-id',
    viewers: new Set(),
    password: null,
    createdAt: Date.now(),
  }),
  
  createMockClient: () => ({
    id: 'test-client-id',
    socket: {
      readyState: 1,
      send: jest.fn(),
      close: jest.fn(),
    },
    type: 'host',
    sessionId: null,
  }),
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};