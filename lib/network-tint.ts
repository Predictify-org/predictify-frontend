export type NetworkType = 'mainnet' | 'testnet' | 'futurenet' | 'unknown';

export interface NetworkTint {
  tint: string;      // The hex color for accents
  bg: string;        // Light background tint (rgba or hex with alpha)
  border: string;    // Border color
  text: string;      // Text color for the badge/indicator
}

export const NETWORK_TINTS: Record<NetworkType, NetworkTint> = {
  mainnet: {
    tint: '#00cffc', // Cyan
    bg: 'rgba(0, 207, 252, 0.15)',
    border: '#00cffc',
    text: '#69daff',
  },
  testnet: {
    tint: '#9333ea', // Purple
    bg: 'rgba(147, 51, 234, 0.15)',
    border: '#9333ea',
    text: '#a855f7',
  },
  futurenet: {
    tint: '#f59e0b', // Amber
    bg: 'rgba(245, 158, 11, 0.15)',
    border: '#f59e0b',
    text: '#fbbf24',
  },
  unknown: {
    tint: '#64748b', // Slate
    bg: 'rgba(100, 116, 139, 0.15)',
    border: '#64748b',
    text: '#94a3b8',
  },
};

export const getNetworkTint = (networkName: string): NetworkTint => {
  const name = networkName.toLowerCase();
  if (name.includes('mainnet')) return NETWORK_TINTS.mainnet;
  if (name.includes('testnet')) return NETWORK_TINTS.testnet;
  if (name.includes('futurenet')) return NETWORK_TINTS.futurenet;
  return NETWORK_TINTS.unknown;
};
