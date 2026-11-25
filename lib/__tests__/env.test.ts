import {
  env,
  formatEnvIssues,
  parseEnv,
  resolveEnv,
  validateEnv,
} from "../env";

const DEFAULTS = {
  NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
  NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
  NEXT_PUBLIC_USE_MOCKS: "false",
  NEXT_PUBLIC_APP_NAME: "Predictify",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_ANALYTICS_ID: "",
  NODE_ENV: "development",
} as const;

describe("lib/env", () => {
  describe("parseEnv", () => {
    it("applies the documented defaults when variables are unset", () => {
      expect(parseEnv({})).toEqual(DEFAULTS);
    });

    it("passes valid values through unchanged", () => {
      const parsed = parseEnv({
        NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
        NEXT_PUBLIC_API_URL: "https://api.predictify.example/v1",
        NEXT_PUBLIC_APP_NAME: "Predictify",
        NEXT_PUBLIC_APP_URL: "https://predictify.example",
        NEXT_PUBLIC_ANALYTICS_ID: "plausible-123",
        NODE_ENV: "production",
      });

      expect(parsed).toEqual({
        NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
        NEXT_PUBLIC_API_URL: "https://api.predictify.example/v1",
        NEXT_PUBLIC_USE_MOCKS: "false",
        NEXT_PUBLIC_APP_NAME: "Predictify",
        NEXT_PUBLIC_APP_URL: "https://predictify.example",
        NEXT_PUBLIC_ANALYTICS_ID: "plausible-123",
        NODE_ENV: "production",
      });
    });

    it("normalises trailing slashes on URLs", () => {
      const parsed = parseEnv({
        NEXT_PUBLIC_API_URL: "https://api.predictify.example/v1/",
        NEXT_PUBLIC_APP_URL: "https://predictify.example///",
      });

      expect(parsed.NEXT_PUBLIC_API_URL).toBe(
        "https://api.predictify.example/v1"
      );
      expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://predictify.example");
    });

    it("trims whitespace-padded values", () => {
      const parsed = parseEnv({
        NEXT_PUBLIC_STELLAR_NETWORK: "  Testnet  ",
        NEXT_PUBLIC_API_URL: "  https://api.predictify.example/v1  ",
        NEXT_PUBLIC_APP_NAME: "  Predictify  ",
        NEXT_PUBLIC_APP_URL: "  https://predictify.example  ",
        NEXT_PUBLIC_ANALYTICS_ID: "  plausible-123  ",
        NODE_ENV: "  test  ",
      });

      expect(parsed).toMatchObject({
        NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
        NEXT_PUBLIC_API_URL: "https://api.predictify.example/v1",
        NEXT_PUBLIC_APP_NAME: "Predictify",
        NEXT_PUBLIC_APP_URL: "https://predictify.example",
        NEXT_PUBLIC_ANALYTICS_ID: "plausible-123",
        NODE_ENV: "test",
      });
    });

    it("accepts an uppercase network name and normalises it", () => {
      expect(
        parseEnv({ NEXT_PUBLIC_STELLAR_NETWORK: "MAINNET" })
          .NEXT_PUBLIC_STELLAR_NETWORK
      ).toBe("mainnet");
    });

    it("rejects a non-http(s) URL scheme", () => {
      expect(() =>
        parseEnv({ NEXT_PUBLIC_API_URL: "ftp://api.predictify.example" })
      ).toThrow(/NEXT_PUBLIC_API_URL: must be a valid absolute http\(s\) URL/);
    });

    it("rejects a host without a scheme", () => {
      expect(() =>
        parseEnv({ NEXT_PUBLIC_APP_URL: "localhost:3000" })
      ).toThrow(/NEXT_PUBLIC_APP_URL: must be a valid absolute http\(s\) URL/);
    });

    it("rejects an empty URL", () => {
      expect(() => parseEnv({ NEXT_PUBLIC_API_URL: "" })).toThrow(
        /NEXT_PUBLIC_API_URL: must not be empty/
      );
    });

    it("rejects a whitespace-only URL", () => {
      expect(() => parseEnv({ NEXT_PUBLIC_APP_URL: "   " })).toThrow(
        /NEXT_PUBLIC_APP_URL: must not be empty/
      );
    });

    it("rejects an empty or whitespace-only app name", () => {
      expect(() => parseEnv({ NEXT_PUBLIC_APP_NAME: "" })).toThrow(
        /NEXT_PUBLIC_APP_NAME: must not be empty/
      );
      expect(() => parseEnv({ NEXT_PUBLIC_APP_NAME: "   " })).toThrow(
        /NEXT_PUBLIC_APP_NAME: must not be empty/
      );
    });

    it("rejects an unknown network", () => {
      expect(() =>
        parseEnv({ NEXT_PUBLIC_STELLAR_NETWORK: "devnet" })
      ).toThrow(/NEXT_PUBLIC_STELLAR_NETWORK: must be 'testnet' or 'mainnet'/);
    });

    it("reports every problem in one aggregated message", () => {
      let message = "";

      try {
        parseEnv({
          NEXT_PUBLIC_STELLAR_NETWORK: "devnet",
          NEXT_PUBLIC_API_URL: "ftp://api.predictify.example",
          NEXT_PUBLIC_APP_URL: "",
        });
      } catch (error) {
        message = (error as Error).message;
      }

      expect(message).toContain("Invalid environment variables:");
      expect(message).toContain("NEXT_PUBLIC_STELLAR_NETWORK");
      expect(message).toContain("NEXT_PUBLIC_API_URL");
      expect(message).toContain("NEXT_PUBLIC_APP_URL");
      expect(message.split("\n")).toHaveLength(4);
    });

    it("treats the analytics id as optional", () => {
      expect(parseEnv({ NEXT_PUBLIC_ANALYTICS_ID: "" })
        .NEXT_PUBLIC_ANALYTICS_ID).toBe("");
      expect(parseEnv({ NEXT_PUBLIC_ANALYTICS_ID: "   " })
        .NEXT_PUBLIC_ANALYTICS_ID).toBe("");
      expect(parseEnv({}).NEXT_PUBLIC_ANALYTICS_ID).toBe("");
    });
  });

  describe("formatEnvIssues", () => {
    it("formats issues with their env key", () => {
      expect(
        formatEnvIssues([
          {
            code: "custom",
            message: "must not be empty",
            path: ["NEXT_PUBLIC_API_URL"],
          },
        ])
      ).toBe(
        ["Invalid environment variables:", "  - NEXT_PUBLIC_API_URL: must not be empty"].join(
          "\n"
        )
      );
    });
  });

  describe("resolveEnv", () => {
    it("keeps valid values and replaces invalid ones with defaults", () => {
      const { env: resolved, issues } = resolveEnv({
        NEXT_PUBLIC_API_URL: "ftp://api.predictify.example",
        NEXT_PUBLIC_APP_URL: "https://predictify.example/",
        NEXT_PUBLIC_APP_NAME: "My App",
      });

      expect(issues).toHaveLength(1);
      expect(issues[0]?.path).toEqual(["NEXT_PUBLIC_API_URL"]);
      expect(resolved.NEXT_PUBLIC_API_URL).toBe(DEFAULTS.NEXT_PUBLIC_API_URL);
      expect(resolved.NEXT_PUBLIC_APP_URL).toBe("https://predictify.example");
      expect(resolved.NEXT_PUBLIC_APP_NAME).toBe("My App");
    });

    it("reports no issues for valid input", () => {
      expect(resolveEnv({ NEXT_PUBLIC_APP_URL: "https://predictify.example" }))
        .toEqual({
          env: {
            ...DEFAULTS,
            NEXT_PUBLIC_APP_URL: "https://predictify.example",
          },
          issues: [],
        });
    });
  });

  describe("validateEnv", () => {
    const originalEnv = { ...process.env };
    const setNodeEnv = (value: string) => {
      (process.env as Record<string, string | undefined>).NODE_ENV = value;
    };

    afterEach(() => {
      for (const key of Object.keys(process.env)) {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      }
      Object.assign(process.env, originalEnv);
      jest.restoreAllMocks();
    });

    it("warns but does not throw outside production", () => {
      setNodeEnv("development");
      process.env.NEXT_PUBLIC_API_URL = "not-a-url";
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => validateEnv()).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain("NEXT_PUBLIC_API_URL");
    });

    it("throws an aggregated error in production", () => {
      setNodeEnv("production");
      process.env.NEXT_PUBLIC_API_URL = "not-a-url";
      process.env.NEXT_PUBLIC_APP_URL = "";

      expect(() => validateEnv()).toThrow(
        /Invalid environment variables:[\s\S]*NEXT_PUBLIC_API_URL[\s\S]*NEXT_PUBLIC_APP_URL/
      );
    });

    it("does nothing when the environment is valid", () => {
      setNodeEnv("production");
      process.env.NEXT_PUBLIC_API_URL = "https://api.predictify.example";
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const error = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => validateEnv()).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe("exported env", () => {
    it("exposes the same keys and defaults as before", () => {
      expect(Object.keys(env).sort()).toEqual(Object.keys(DEFAULTS).sort());
      expect(env).toMatchObject({
        ...DEFAULTS,
        // Jest sets NODE_ENV=test; the module mirrors the process value.
        NODE_ENV: process.env.NODE_ENV,
      });
    });

    it("stays compatible with lib/config.ts", () => {
      const { getConfig } = require("../config") as typeof import("../config");
      const config = getConfig();

      expect(config.app).toEqual({
        name: env.NEXT_PUBLIC_APP_NAME,
        url: env.NEXT_PUBLIC_APP_URL,
      });
      expect(config.api.url).toBe(env.NEXT_PUBLIC_API_URL);
      expect(["testnet", "mainnet"]).toContain(config.stellar.network);
    });
  });
});
