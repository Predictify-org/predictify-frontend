/**
 * KMS Signer Interface
 * 
 * Abstract interface for signing Stellar/Soroban transactions using
 * different key management strategies (AWS KMS, HSM, Local Mock).
 */

export interface SignOptions {
  /** Optional metadata for audit logs */
  auditContext?: Record<string, string>;
}

export interface KmsSigner {
  /**
   * Returns the Stellar public key (G...)
   */
  getPublicKey(): Promise<string>;

  /**
   * Signs a payload (typically a transaction hash)
   * Returns the signature as a Buffer
   */
  sign(payload: Buffer, options?: SignOptions): Promise<Buffer>;

  /**
   * Returns the provider name (e.g., 'aws-kms', 'local-mock')
   */
  getProviderName(): string;
}

export interface KmsConfig {
  provider: 'aws-kms' | 'local-mock';
  keyId?: string;
  region?: string;
  mockSecret?: string;
}
