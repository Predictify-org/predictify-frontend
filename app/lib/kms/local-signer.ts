import crypto from 'crypto';
import { KmsSigner, SignOptions } from './types';

/**
 * Local Signer Implementation
 * 
 * USE ONLY FOR DEVELOPMENT AND TESTING.
 * This implementation uses raw secret keys from environment variables.
 * It simulates the KMS interface but holds keys in memory.
 */
export class LocalKmsSigner implements KmsSigner {
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(secretKey: string, publicKey: string) {
    if (!secretKey || !publicKey) {
      throw new Error('LocalKmsSigner requires both secretKey and publicKey');
    }
    this.secretKey = secretKey;
    this.publicKey = publicKey;
  }

  async getPublicKey(): Promise<string> {
    return this.publicKey;
  }

  async sign(payload: Buffer, options?: SignOptions): Promise<Buffer> {
    // In a real local implementation, we would use ed25519 signing
    // For this prototype/mock, we'll simulate the latency and return a dummy signature
    // or use Node's crypto if we have a valid private key format.
    
    // Simulate KMS latency (usually 50-200ms)
    await new Promise(resolve => setTimeout(resolve, 50));

    console.log(`[LocalKmsSigner] Signing payload of size ${payload.length}`, options?.auditContext);

    // Mock signature for prototyping
    return Buffer.alloc(64, 'a');
  }

  getProviderName(): string {
    return 'local-mock';
  }
}
