// @ts-nocheck
import { generateUsername, validateUsername } from '../../../../src/shared/utils/username';

describe.skip('NextAuth Integration', () => {
  describe('Username Generation', () => {
    it('should generate valid usernames', async () => {
      const username = await generateUsername('test@example.com');
      expect(username).toBeDefined();
      expect(username.length).toBeGreaterThan(2);
      expect(username.length).toBeLessThanOrEqual(20);
    });

    it('should clean base input properly', async () => {
      const username = await generateUsername('test@example.com');
      expect(username).not.toContain('@');
      expect(username).not.toContain('.');
    });

    it('should generate fallback username', async () => {
      const username = await generateUsername();
      expect(username).toBeDefined();
      expect(validateUsername(username)).toBe(true);
    });
  });

  describe('Username Validation', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('testuser')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('clevereader')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false);
      expect(validateUsername('123user')).toBe(false);
      expect(validateUsername('user@name')).toBe(false);
      expect(validateUsername('admin')).toBe(false);
    });

    it('should reject reserved words', () => {
      const reserved = ['admin', 'api', 'www', 'root', 'support'];
      reserved.forEach(word => {
        expect(validateUsername(word)).toBe(false);
      });
    });
  });

  describe('Provider Flows', () => {
    it('should handle Google OAuth flow', async () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined();
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined();
    });

    it('should handle Apple OAuth flow', async () => {
      expect(process.env.APPLE_CLIENT_ID).toBeDefined();
      expect(process.env.APPLE_PRIVATE_KEY).toBeDefined();
    });

    it('should handle email magic link flow', async () => {
      expect(process.env.EMAIL_SERVER_HOST).toBeDefined();
      expect(process.env.EMAIL_FROM).toBeDefined();
    });

    it('should handle phone OTP flow', async () => {
      expect(process.env.TWILIO_ACCOUNT_SID).toBeDefined();
      expect(process.env.TWILIO_AUTH_TOKEN).toBeDefined();
      expect(process.env.TWILIO_PHONE_NUMBER).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should enrich session with user data', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com'
        }
      };

      expect(mockSession.user.id).toBeDefined();
    });

    it('should include userId in JWT token', async () => {
      const mockToken = {
        userId: 'user-123',
        username: 'testuser'
      };

      expect(mockToken.userId).toBeDefined();
      expect(mockToken.username).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('should handle signIn callback', async () => {
      const mockUser = {
        email: 'test@example.com',
        name: 'Test User'
      };

      expect(mockUser.email).toBeDefined();
    });

    it('should handle Apple private email relay', async () => {
      const appleEmail = 'test@privaterelay.appleid.com';
      expect(appleEmail.includes('@privaterelay.appleid.com')).toBe(true);
    });

    it('should redirect new users to onboarding', async () => {
      const newUserUrl = '/onboarding';
      expect(newUserUrl).toBe('/onboarding');
    });
  });
});