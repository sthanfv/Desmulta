import { encryptData, decryptData, hashData } from '../crypto';

describe('Zero-PII Cryptography Module', () => {
  const mockEncryptionKey = '266fd009359e2acd3221bef81632742ad3f36c7ff04f6a3492fa902feb173bbd';
  const mockSalt = '6325d3fa7cb23996878c79513e4fb93ee29684fbc1999f4664d96ec942ae2c91';

  beforeAll(() => {
    process.env.SIMIT_ENCRYPTION_KEY = mockEncryptionKey;
    process.env.SIMIT_SALT = mockSalt;
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalText = '1234567890';
      const encrypted = encryptData(originalText);

      expect(encrypted).not.toBe(originalText);
      expect(encrypted.split(':').length).toBe(3); // iv, authTag, encryptedData

      const decrypted = decryptData(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted outputs for the same input due to random IV', () => {
      const originalText = '1234567890';
      const encrypted1 = encryptData(originalText);
      const encrypted2 = encryptData(originalText);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = decryptData(encrypted1);
      const decrypted2 = decryptData(encrypted2);

      expect(decrypted1).toBe(originalText);
      expect(decrypted2).toBe(originalText);
    });

    it('should throw an error when decrypting invalid format', () => {
      expect(() => decryptData('invalid_format')).toThrow();
    });
  });

  describe('hashData', () => {
    it('should produce consistent hashes for the same input', () => {
      const originalText = '1234567890';
      const hash1 = hashData(originalText);
      const hash2 = hashData(originalText);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(originalText);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashData('1234567890');
      const hash2 = hashData('0987654321');

      expect(hash1).not.toBe(hash2);
    });
  });
});
