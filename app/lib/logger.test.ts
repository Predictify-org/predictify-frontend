import { logger } from "./logger";

describe("logger", () => {
  it("logs info message", () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    logger.info("test message", { key: "value" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"level":"info"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"test message"'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"key":"value"'));
    spy.mockRestore();
  });
});
