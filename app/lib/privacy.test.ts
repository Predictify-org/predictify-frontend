import { redact } from "./privacy";

describe("privacy", () => {
  it("redacts sensitive keys", () => {
    const data = {
      publicKey: "G123456789",
      signature: "some-sig",
      email: "test@example.org",
      amount: "100",
      nested: {
        secret: "top-secret"
      }
    };
    const redacted = redact(data);
    expect(redacted.publicKey).toBe("[REDACTED]");
    expect(redacted.signature).toBe("[REDACTED]");
    expect(redacted.email).toBe("[REDACTED]");
    expect(redacted.amount).toBe("100");
    expect(redacted.nested.secret).toBe("[REDACTED]");
  });
});
