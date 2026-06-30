// scripts/stellar-dev-lib.js
// Pure logic extracted from stellar-dev.sh for unit testing.
// No side effects; no network calls.
"use strict";

/**
 * Returns an error message if NODE_ENV is "production", otherwise null.
 * @param {string|undefined} nodeEnv
 * @returns {string|null}
 */
function checkProdGuard(nodeEnv) {
  if (nodeEnv === "production") {
    return "Refusing to run in NODE_ENV=production. This script is for testnet/development only.";
  }
  return null;
}

/**
 * Validates required/recommended env vars.
 * Returns an array of missing variable names.
 * @param {Record<string, string|undefined>} env
 * @returns {string[]}
 */
function validateEnv(env) {
  const missing = [];
  if (!env.NEXT_PUBLIC_API_URL) missing.push("NEXT_PUBLIC_API_URL");
  return missing;
}

/**
 * Parses a colon-separated keypair string "SECRET:PUBLIC".
 * @param {string} raw
 * @returns {{ secretKey: string; publicKey: string }}
 */
function parseKeypair(raw) {
  const idx = raw.indexOf(":");
  if (idx === -1) throw new Error("Invalid keypair format; expected SECRET:PUBLIC");
  return { secretKey: raw.slice(0, idx), publicKey: raw.slice(idx + 1) };
}

/**
 * Validates that a Stellar public key starts with "G" and is 56 chars.
 * @param {string} key
 * @returns {boolean}
 */
function isValidStellarPublicKey(key) {
  return typeof key === "string" && key.startsWith("G") && key.length === 56;
}

/**
 * Validates that a Stellar secret key starts with "S" and is 56 chars.
 * @param {string} key
 * @returns {boolean}
 */
function isValidStellarSecretKey(key) {
  return typeof key === "string" && key.startsWith("S") && key.length === 56;
}

/**
 * Returns the fixture streams array (no network calls).
 * @param {string} sender
 * @returns {Array<{sender: string, recipient: string, amount: string, asset: string, memo: string}>}
 */
function buildFixturePayloads(sender) {
  const FIXTURE_STREAMS = [
    {
      recipient: "GBSAMPLERECIPIENT1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      amount: "10.0000000",
      asset: "XLM",
      memo: "fixture: monthly salary",
    },
    {
      recipient: "GBSAMPLERECIPIENT2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      amount: "5.5000000",
      asset: "XLM",
      memo: "fixture: weekly stipend",
    },
    {
      recipient: "GBSAMPLERECIPIENT3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      amount: "100.0000000",
      asset: "XLM",
      memo: "fixture: quarterly grant",
    },
  ];
  return FIXTURE_STREAMS.map((s) => ({ sender, ...s }));
}

module.exports = {
  checkProdGuard,
  validateEnv,
  parseKeypair,
  isValidStellarPublicKey,
  isValidStellarSecretKey,
  buildFixturePayloads,
};
