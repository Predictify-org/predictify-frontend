import { randomUUID, createHash, verify } from "crypto";
import { MAINNET_PROFILE, TESTNET_PROFILE } from "./config/stellar";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK === "mainnet"
    ? MAINNET_PROFILE.passphrase
    : TESTNET_PROFILE.passphrase;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CHALLENGE_PREFIX = "StreamPay wallet authentication challenge";
const ED25519_SPki_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export type WalletLinkChallenge = {
  publicKey: string;
  nonce: string;
  message: string;
  expiresAt: number;
  used: boolean;
};

export class WalletLinkError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const pendingChallenges = new Map<string, WalletLinkChallenge>();

function crc16Xmodem(data: Uint8Array): number {
  let crc = 0x0000;

  for (const byte of data) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
    }
  }

  return crc;
}

function base32Encode(bytes: Uint8Array): string {
  let value = 0;
  let bits = 0;
  let result = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(input: string): Uint8Array | null {
  const normalized = input.replace(/=+$/, "").toUpperCase();
  let value = 0;
  let bits = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      return null;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  if (bits >= 5 || (value & ((1 << bits) - 1)) !== 0) {
    return null;
  }

  return Uint8Array.from(bytes);
}

function decodeStellarPublicKey(publicKey: string): Uint8Array | null {
  if (typeof publicKey !== "string" || publicKey.length !== 56 || !publicKey.startsWith("G")) {
    return null;
  }

  const decoded = base32Decode(publicKey);
  if (!decoded || decoded.length !== 35) {
    return null;
  }

  const version = decoded[0];
  if (version !== 6 << 3) {
    return null;
  }

  const payload = decoded.subarray(0, 33);
  const checksum = decoded[33] | (decoded[34] << 8);
  if (crc16Xmodem(payload) !== checksum) {
    return null;
  }

  return decoded.subarray(1, 33);
}

export function isValidStellarPublicKey(publicKey: string): boolean {
  return decodeStellarPublicKey(publicKey) !== null;
}

export function encodeStellarPublicKey(rawPublicKey: Uint8Array): string {
  if (rawPublicKey.length !== 32) {
    throw new Error("Invalid raw public key length");
  }

  const payload = new Uint8Array(35);
  payload[0] = 6 << 3;
  payload.set(rawPublicKey, 1);
  const checksum = crc16Xmodem(payload.subarray(0, 33));
  payload[33] = checksum & 0xff;
  payload[34] = (checksum >>> 8) & 0xff;

  return base32Encode(payload);
}

function buildChallengeMessage(publicKey: string, nonce: string, expiresAtIso: string): string {
  return [
    CHALLENGE_PREFIX,
    `Network: ${NETWORK_PASSPHRASE}`,
    `Public key: ${publicKey}`,
    `Nonce: ${nonce}`,
    `Expires at: ${expiresAtIso}`,
  ].join("\n");
}

function cleanupExpiredChallenges(): void {
  const now = Date.now();
  for (const [nonce, challenge] of pendingChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      pendingChallenges.delete(nonce);
    }
  }
}

export function issueWalletLinkChallenge(publicKey: string): {
  publicKey: string;
  nonce: string;
  message: string;
  expiresAt: string;
} {
  if (!isValidStellarPublicKey(publicKey)) {
    throw new WalletLinkError("VALIDATION_ERROR", "Invalid Stellar public key", 422);
  }

  cleanupExpiredChallenges();

  const nonce = randomUUID();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const expiresAtIso = new Date(expiresAt).toISOString();
  const message = buildChallengeMessage(publicKey, nonce, expiresAtIso);

  pendingChallenges.set(nonce, {
    publicKey,
    nonce,
    message,
    expiresAt,
    used: false,
  });

  return { publicKey, nonce, message, expiresAt: expiresAtIso };
}

export function resetWalletLinkChallenges(): void {
  pendingChallenges.clear();
}

export function verifyWalletLinkChallenge(input: {
  publicKey: string;
  nonce: string;
  message: string;
  signature: string;
}): void {
  cleanupExpiredChallenges();

  const { publicKey, nonce, message, signature } = input;
  if (!publicKey || !nonce || !message || !signature) {
    throw new WalletLinkError("VALIDATION_ERROR", "Missing required challenge fields", 422);
  }

  const challenge = pendingChallenges.get(nonce);
  if (!challenge) {
    throw new WalletLinkError("INVALID_CHALLENGE", "Challenge not found or expired", 401);
  }

  if (challenge.used) {
    throw new WalletLinkError("CHALLENGE_REPLAYED", "Challenge has already been used", 401);
  }

  if (challenge.publicKey !== publicKey || challenge.message !== message) {
    throw new WalletLinkError("INVALID_CHALLENGE", "Challenge data does not match", 401);
  }

  const publicKeyBytes = decodeStellarPublicKey(publicKey);
  if (!publicKeyBytes) {
    throw new WalletLinkError("VALIDATION_ERROR", "Invalid Stellar public key", 422);
  }

  const signatureBytes = Buffer.from(signature, "base64");
  if (signatureBytes.length !== 64) {
    throw new WalletLinkError("INVALID_SIGNATURE", "Signature must be a 64-byte Ed25519 signature", 401);
  }

  const publicKeyDer = Buffer.concat([ED25519_SPki_PREFIX, Buffer.from(publicKeyBytes)]);
  const verified = verify(
    "ed25519",
    Buffer.from(message, "utf-8"),
    { key: publicKeyDer, format: "der", type: "spki" },
    signatureBytes
  );

  if (!verified) {
    throw new WalletLinkError("INVALID_SIGNATURE", "Signature verification failed", 401);
  }

  challenge.used = true;
}
