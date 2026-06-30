import { parseAssetString, verifyTrustline, NATIVE_ASSET } from './assets';

describe('Asset Engine', () => {
  describe('parseAssetString', () => {
    it('parses XLM correctly', () => {
      expect(parseAssetString('XLM')).toEqual(NATIVE_ASSET);
      expect(parseAssetString('native')).toEqual(NATIVE_ASSET);
    });

    it('parses custom assets correctly', () => {
      const assetStr = 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335XOP3IA2M3QC2ED2AAA7Z5TJH';
      const parsed = parseAssetString(assetStr);
      expect(parsed.code).toBe('USDC');
      expect(parsed.issuer).toBe('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335XOP3IA2M3QC2ED2AAA7Z5TJH');
      expect(parsed.isNative).toBe(false);
    });

    it('throws on invalid formats', () => {
      expect(() => parseAssetString('USDC')).toThrow();
      expect(() => parseAssetString('USDC:short')).toThrow();
    });
  });

  describe('verifyTrustline', () => {
    const mockPublicKey = 'GBZZ..';
    const customAsset = { 
      code: 'USDC', 
      issuer: 'GA5Z..', 
      isNative: false 
    };

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('returns true for native asset without network call', async () => {
      const result = await verifyTrustline(mockPublicKey, NATIVE_ASSET);
      expect(result.exists).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns true if trustline exists', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          balances: [
            { asset_code: 'USDC', asset_issuer: 'GA5Z..' }
          ]
        })
      });

      const result = await verifyTrustline(mockPublicKey, customAsset);
      expect(result.exists).toBe(true);
    });

    it('returns false and error if trustline missing', async () => {
       (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          balances: [
            { asset_type: 'native' }
          ]
        })
      });

      const result = await verifyTrustline(mockPublicKey, customAsset);
      expect(result.exists).toBe(false);
      expect(result.error).toContain('Missing trustline');
    });

    it('handles 404 account not found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        status: 404,
        ok: false
      });

      const result = await verifyTrustline(mockPublicKey, customAsset);
      expect(result.exists).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });
});
