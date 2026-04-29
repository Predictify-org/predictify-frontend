import { LocalKmsSigner } from '../local-signer';
import { createKmsSigner, getSigner } from '../factory';

describe('KMS Signing Strategy', () => {
  const MOCK_SECRET = 'S_MOCK_SECRET_KEY_56_CHARS_LONG_AAAAAAAAAAAAAAAAAAAAAAA';
  const MOCK_PUBLIC = 'G_MOCK_PUBLIC_KEY_56_CHARS_LONG_AAAAAAAAAAAAAAAAAAAAAA';

  describe('LocalKmsSigner', () => {
    it('should return the public key', async () => {
      const signer = new LocalKmsSigner(MOCK_SECRET, MOCK_PUBLIC);
      const pubKey = await signer.getPublicKey();
      expect(pubKey).toBe(MOCK_PUBLIC);
    });

    it('should sign a payload with simulated latency', async () => {
      const signer = new LocalKmsSigner(MOCK_SECRET, MOCK_PUBLIC);
      const payload = Buffer.from('hello-stellar');
      
      const start = Date.now();
      const signature = await signer.sign(payload);
      const duration = Date.now() - start;

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64);
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Factory', () => {
    it('should create a LocalKmsSigner by default', () => {
      const signer = getSigner();
      expect(signer.getProviderName()).toBe('local-mock');
    });

    it('should throw error for unknown provider', () => {
      expect(() => createKmsSigner({ provider: 'invalid' as any }))
        .toThrow('Unknown KMS provider: invalid');
    });

    it('should throw error for AWS KMS without keyId', () => {
      expect(() => createKmsSigner({ provider: 'aws-kms' }))
        .toThrow('AWS KMS provider requires a keyId');
    });
  });
});
