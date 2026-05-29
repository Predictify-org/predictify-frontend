/**
 * Centralized Stellar Network Configuration
 * 
 * This module provides strict, type-safe network profiles for Stellar.
 * All network configuration MUST come from this module only.
 * 
 * SECURITY: Never hardcode network passphrases or Horizon URLs in handlers/services.
 * SECURITY: Never use fallback defaults that could silently route to mainnet.
 */

export type StellarNetwork = 'testnet' | 'mainnet' | 'future';

/**
 * Network profile definition
 */
export interface StellarNetworkProfile {
  /** Network identifier */
  name: StellarNetwork;
  /** Stellar network passphrase for transaction signing */
  passphrase: string;
  /** Horizon server URL for API calls */
  horizonUrl: string;
  /** Whether friendbot is available for funding */
  hasFriendbot: boolean;
  /** Friendbot URL if available */
  friendbotUrl?: string;
  /** Explorer URL for transaction viewing */
  explorerUrl: string;
  /** Asset labeling suffix for UI safety */
  assetLabel: string;
  /** Whether this is a production network */
  isProduction: boolean;
}

/**
 * Stellar Testnet Profile
 */
export const TESTNET_PROFILE: StellarNetworkProfile = {
  name: 'testnet',
  passphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  hasFriendbot: true,
  friendbotUrl: 'https://friendbot.stellar.org',
  explorerUrl: 'https://stellar.expert/testnet',
  assetLabel: 'TESTNET',
  isProduction: false,
};

/**
 * Stellar Mainnet Profile
 */
export const MAINNET_PROFILE: StellarNetworkProfile = {
  name: 'mainnet',
  passphrase: 'Public Global Stellar Network ; September 2015',
  horizonUrl: 'https://horizon.stellar.org',
  hasFriendbot: false,
  explorerUrl: 'https://stellar.expert',
  assetLabel: '',
  isProduction: true,
};

/**
 * Network profile registry
 * Note: 'future' is reserved for future network implementations
 */
const NETWORK_PROFILES: Partial<Record<StellarNetwork, StellarNetworkProfile>> = {
  testnet: TESTNET_PROFILE,
  mainnet: MAINNET_PROFILE,
  // Future networks can be added here
};

/**
 * Get network profile by name
 * @throws Error if network is not supported
 */
export function getNetworkProfile(network: StellarNetwork): StellarNetworkProfile {
  const profile = NETWORK_PROFILES[network];
  if (!profile) {
    throw new Error(`Unsupported Stellar network: ${network}. Supported networks: ${getSupportedNetworks().join(', ')}`);
  }
  return profile;
}

/**
 * Get all supported network names
 */
export function getSupportedNetworks(): StellarNetwork[] {
  return Object.keys(NETWORK_PROFILES) as StellarNetwork[];
}

/**
 * Validate that a passphrase matches the expected network
 */
export function validatePassphraseForNetwork(
  passphrase: string,
  network: StellarNetwork
): boolean {
  const profile = getNetworkProfile(network);
  return passphrase === profile.passphrase;
}

/**
 * Validate that a Horizon URL matches the expected network
 */
export function validateHorizonUrlForNetwork(
  horizonUrl: string,
  network: StellarNetwork
): boolean {
  const profile = getNetworkProfile(network);
  return horizonUrl === profile.horizonUrl;
}
