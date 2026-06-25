import jwt from "jsonwebtoken";
import { addKey, generateRsaKeypair, KEY_OVERLAP_MS, resolvePublicKeyByKid, getPublicKeys } from "./auth";
import { tryAuthenticateRequest } from "./auth";

describe("JWKS rotation and verification", () => {
  it("verifies tokens signed by active key and by recently retired key within overlap window", async () => {
    // generate two keypairs: old and new
    const old = generateRsaKeypair();
    const nw = generateRsaKeypair();

    const now = Date.now();

    // add old key and mark it retired just now
    addKey({ kid: old.kid, publicKeyPem: old.publicKeyPem, privateKeyPem: old.privateKeyPem, createdAt: now - 1000 * 60 * 60, retiredAt: now });
    // add new active key
    addKey({ kid: nw.kid, publicKeyPem: nw.publicKeyPem, privateKeyPem: nw.privateKeyPem, createdAt: now + 1 });

    // sign a token with the new active key using sign with private
    const tokenNew = jwt.sign({ sub: "GABC", iss: "streampay", aud: "streampay-api" }, nw.privateKeyPem, { algorithm: "RS256", expiresIn: "1h", keyid: nw.kid });

    const reqNew = new Request("http://localhost", { headers: { authorization: `Bearer ${tokenNew}` } });
    const actorNew = tryAuthenticateRequest(reqNew as any);
    expect(actorNew).not.toBeNull();
    if (actorNew) expect(actorNew.walletAddress).toBe("GABC");

    // sign a token with the old key (retired now) — should still verify due to overlap
    const tokenOld = jwt.sign({ sub: "GOLD", iss: "streampay", aud: "streampay-api" }, old.privateKeyPem, { algorithm: "RS256", expiresIn: "1h", keyid: old.kid });
    const reqOld = new Request("http://localhost", { headers: { authorization: `Bearer ${tokenOld}` } });
    const actorOld = tryAuthenticateRequest(reqOld as any);
    expect(actorOld).not.toBeNull();
    if (actorOld) expect(actorOld.walletAddress).toBe("GOLD");
  });

  it("rejects tokens signed by a key retired longer than overlap window", async () => {
    const kp = generateRsaKeypair();
    const now = Date.now();
    // retired long ago
    addKey({ kid: kp.kid, publicKeyPem: kp.publicKeyPem, privateKeyPem: kp.privateKeyPem, createdAt: now - KEY_OVERLAP_MS - 1000000, retiredAt: now - KEY_OVERLAP_MS - 5000 });

    const token = jwt.sign({ sub: "GOLD2", iss: "streampay", aud: "streampay-api" }, kp.privateKeyPem, { algorithm: "RS256", expiresIn: "1h", keyid: kp.kid });
    const req = new Request("http://localhost", { headers: { authorization: `Bearer ${token}` } });
    const actor = tryAuthenticateRequest(req as any);
    expect(actor).toBeNull();
  });

  it("exposes public keys via getPublicKeys", () => {
    const keys = getPublicKeys();
    expect(Array.isArray(keys)).toBe(true);
    // Each key should have kid and publicKeyPem
    for (const k of keys) {
      expect(k.kid).toBeDefined();
      expect(k.publicKeyPem).toMatch(/-----BEGIN PUBLIC KEY-----/);
    }
  });
});
