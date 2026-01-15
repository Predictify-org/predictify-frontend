/**
 * Environment variable validation and type-safe access
 * This ensures all required environment variables are present at build time
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value || '';
}

/**
 * Public environment variables (safe to expose to client)
 */
export const env = {
  // Stellar Configuration
  NEXT_PUBLIC_STELLAR_NETWORK: getEnvVar('NEXT_PUBLIC_STELLAR_NETWORK', 'testnet'),
  
  // API Configuration
  NEXT_PUBLIC_API_URL: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api'),
  
  // Application Configuration
  NEXT_PUBLIC_APP_NAME: getEnvVar('NEXT_PUBLIC_APP_NAME', 'Predictify'),
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  
  // Optional: Analytics
  NEXT_PUBLIC_ANALYTICS_ID: getEnvVar('NEXT_PUBLIC_ANALYTICS_ID'),
  
  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

/**
 * Validate environment variables on module load
 */
export function validateEnv() {
  const requiredVars = [
    'NEXT_PUBLIC_STELLAR_NETWORK',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  const missing = requiredVars.filter(
    (key) => !process.env[key] && process.env.NODE_ENV === 'production'
  );
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
  
  // Validate Stellar network value
  const network = env.NEXT_PUBLIC_STELLAR_NETWORK.toLowerCase();
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error(
      `Invalid NEXT_PUBLIC_STELLAR_NETWORK: ${network}. Must be 'testnet' or 'mainnet'`
    );
  }
}

// Validate on import in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

