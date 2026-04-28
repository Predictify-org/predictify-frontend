/** @jest-environment node */

import jwt from "jsonwebtoken";
import type { KeyObject } from "crypto";
import { generateKeyPairSync, sign } from "crypto";
import { GET, POST } from "./route";
import { encodeStellarPublicKey, resetWalletLinkChallenges } from "@/app/lib/wallet-link";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";
import { JWT_SECRET } from "@/app/lib/auth";

function extractRawPublicKey(publicKey: KeyObject): Uint8Array {
  const spkiDer = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const prefix = Buffer.from("302a300506032b6570032100", "hex");
  return spkiDer.subarray(prefix.length);
}

function createStellarKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: encodeStellarPublicKey(extractRawPublicKey(publicKey)),
    privateKey,
  };
}

describe("Wallet auth challenge flow", () => {
  beforeEach(() => {
    resetAuditLogStore();
    resetWalletLinkChallenges();
  });

  it("issues a challenge and verifies a signed response", async () => {
    const { publicKey, privateKey } = createStellarKeyPair();

    const challengeResponse = await GET(new Request(`http://localhost/api/auth/wallet?publicKey=${publicKey}`));
    expect(challengeResponse.status).toBe(200);

    const challengeBody = await challengeResponse.json();
    expect(challengeBody.data.publicKey).toBe(publicKey);
    expect(typeof challengeBody.data.nonce).toBe("string");
    expect(challengeBody.data.message).toContain("StreamPay wallet authentication challenge");

    const signature = sign("ed25519", Buffer.from(challengeBody.data.message, "utf-8"), privateKey);
    const verifyResponse = await POST(
      new Request("http://localhost/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challengeBody.data.nonce,
          message: challengeBody.data.message,
          signature: signature.toString("base64"),
        }),
      })
    );

    expect(verifyResponse.status).toBe(200);
    const verifyBody = await verifyResponse.json();
    expect(verifyBody.accessToken).toBeDefined();
    expect(verifyBody.expiresIn).toBe(900);

    const decoded = jwt.verify(verifyBody.accessToken, JWT_SECRET) as Record<string, unknown>;
    expect(decoded.sub).toBe(publicKey);
    expect(auditLogStore.list({ action: "wallet.link", targetId: publicKey })).toHaveLength(1);
  });

  it("rejects a wrong signature", async () => {
    const { publicKey, privateKey } = createStellarKeyPair();
    const wrongKeyPair = createStellarKeyPair();

    const challengeResponse = await GET(new Request(`http://localhost/api/auth/wallet?publicKey=${publicKey}`));
    const challengeBody = await challengeResponse.json();

    const badSignature = sign("ed25519", Buffer.from(challengeBody.data.message, "utf-8"), wrongKeyPair.privateKey);
    const response = await POST(
      new Request("http://localhost/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challengeBody.data.nonce,
          message: challengeBody.data.message,
          signature: badSignature.toString("base64"),
        }),
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_SIGNATURE");
  });

  it("rejects a challenge signed with the wrong network passphrase", async () => {
    const { publicKey, privateKey } = createStellarKeyPair();

    const challengeResponse = await GET(new Request(`http://localhost/api/auth/wallet?publicKey=${publicKey}`));
    const challengeBody = await challengeResponse.json();

    const wrongMessage = challengeBody.data.message.replace("Network: ", "Network: Invalid Stellar Network passphrase ");
    const wrongSignature = sign("ed25519", Buffer.from(wrongMessage, "utf-8"), privateKey);

    const response = await POST(
      new Request("http://localhost/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challengeBody.data.nonce,
          message: wrongMessage,
          signature: wrongSignature.toString("base64"),
        }),
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_CHALLENGE");
  });

  it("rejects an expired challenge", async () => {
    const { publicKey, privateKey } = createStellarKeyPair();

    const challengeResponse = await GET(new Request(`http://localhost/api/auth/wallet?publicKey=${publicKey}`));
    const challengeBody = await challengeResponse.json();

    const originalNow = Date.now;
    const future = originalNow() + 10 * 60 * 1000;
    jest.spyOn(Date, "now").mockReturnValue(future);

    const signature = sign("ed25519", Buffer.from(challengeBody.data.message, "utf-8"), privateKey);
    const response = await POST(
      new Request("http://localhost/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challengeBody.data.nonce,
          message: challengeBody.data.message,
          signature: signature.toString("base64"),
        }),
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_CHALLENGE");
    jest.spyOn(Date, "now").mockRestore();
  });

  it("rejects reuse of the same challenge nonce", async () => {
    const { publicKey, privateKey } = createStellarKeyPair();

    const challengeResponse = await GET(new Request(`http://localhost/api/auth/wallet?publicKey=${publicKey}`));
    const challengeBody = await challengeResponse.json();

    const signature = sign("ed25519", Buffer.from(challengeBody.data.message, "utf-8"), privateKey);
    const firstResponse = await POST(
      new Request("http://localhost/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challengeBody.data.nonce,
          message: challengeBody.data.message,
          signature: signature.toString("base64"),
        }),
      })
    );

    expect(firstResponse.status).toBe(200);

    const replayResponse = await POST(
      new Request("http://localhost/api/auth/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey,
          nonce: challengeBody.data.nonce,
          message: challengeBody.data.message,
          signature: signature.toString("base64"),
        }),
      })
    );

    expect(replayResponse.status).toBe(401);
    const body = await replayResponse.json();
    expect(body.error.code).toBe("CHALLENGE_REPLAYED");
  });
});
