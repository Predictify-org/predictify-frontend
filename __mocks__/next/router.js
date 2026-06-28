const { jest } = require("@jest/globals");

module.exports = {
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    reload: jest.fn(),
    prefetch: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  })),
};
