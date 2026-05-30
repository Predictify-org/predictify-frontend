import { KmsSigner, KmsConfig } from './types';
import { LocalKmsSigner } from './local-signer';
import { AwsKmsSigner } from './aws-signer';

/**
 * KMS Signer Factory
 * 
 * Returns the appropriate signer instance based on configuration.
 */
export function createKmsSigner(config: KmsConfig): KmsSigner {
  switch (config.provider) {
    case 'aws-kms':
      if (!config.keyId) {
        throw new Error('AWS KMS provider requires a keyId');
      }
      return new AwsKmsSigner(config.keyId, config.region);
    
    case 'local-mock':
      // In local mode, we might get the secret from an env var
      const secret = config.mockSecret || process.env.STELLAR_MOCK_SECRET || 'S_MOCK_SECRET_KEY_56_CHARS_LONG_AAAAAAAAAAAAAAAAAAAAAAA';
      const public_key = 'G_MOCK_PUBLIC_KEY_56_CHARS_LONG_AAAAAAAAAAAAAAAAAAAAAA';
      return new LocalKmsSigner(secret, public_key);
    
    default:
      throw new Error(`Unknown KMS provider: ${config.provider}`);
  }
}

/**
 * Singleton-like access to the default signer for the application
 */
let defaultSigner: KmsSigner | null = null;

export function getSigner(): KmsSigner {
  if (defaultSigner) return defaultSigner;

  const provider = (process.env.KMS_PROVIDER as any) || 'local-mock';
  const config: KmsConfig = {
    provider,
    keyId: process.env.KMS_KEY_ID,
    region: process.env.KMS_REGION,
  };

  defaultSigner = createKmsSigner(config);
  return defaultSigner;
}
