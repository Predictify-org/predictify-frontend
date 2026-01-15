/**
 * Application configuration
 * Centralized configuration management with environment variable validation
 */

import { env } from './env';

type Network = 'testnet' | 'mainnet';

interface AppConfig {
  app: {
    name: string;
    url: string;
  };
  stellar: {
    network: Network;
  };
  api: {
    url: string;
  };
}

/**
 * Get the Stellar network from environment variables
 */
function getStellarNetwork(): Network {
  const network = env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase();
  
  if (network === 'mainnet' || network === 'testnet') {
    return network as Network;
  }
  
  // Default to testnet for safety
  if (env.NODE_ENV === 'production') {
    console.warn('NEXT_PUBLIC_STELLAR_NETWORK not set correctly, defaulting to testnet');
  }
  
  return 'testnet';
}

/**
 * Validate and get application configuration
 */
export function getConfig(): AppConfig {
  return {
    app: {
      name: env.NEXT_PUBLIC_APP_NAME,
      url: env.NEXT_PUBLIC_APP_URL,
    },
    stellar: {
      network: getStellarNetwork(),
    },
    api: {
      url: env.NEXT_PUBLIC_API_URL,
    },
  };
}

/**
 * Client-side configuration (for use in browser)
 * Only includes public environment variables
 */
export function getClientConfig() {
  if (typeof window === 'undefined') {
    throw new Error('getClientConfig can only be used on the client side');
  }
  
  const network = env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase();
  
  return {
    app: {
      name: env.NEXT_PUBLIC_APP_NAME,
      url: env.NEXT_PUBLIC_APP_URL,
    },
    stellar: {
      network: (network === 'mainnet' || network === 'testnet' 
        ? network 
        : 'testnet') as Network,
    },
    api: {
      url: env.NEXT_PUBLIC_API_URL,
    },
  };
}

// Export singleton instance
export const config = getConfig();

