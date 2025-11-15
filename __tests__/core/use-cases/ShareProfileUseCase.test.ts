import { ShareProfileUseCase, ShareProfileDTO } from '../../../src/core/use-cases/ShareProfileUseCase';
import { ProfileVisibility, createUserId } from '../../../src/core/entities/User';
import { AuthorizationError, NotFoundError, ValidationError } from '../../../src/shared/types/errors';

// Mock dependencies
const mockUserRepository = {
  findById: jest.fn()
};

const mockJWTService = {
  sign: jest.fn()
};

const mockCache = {
  set: jest.fn()
};

const mockAnalytics = {
  track: jest.fn()
};

const mockAuditLogger = {
  log: jest.fn()
};

describe('ShareProfileUseCase', () => {
  let useCase: ShareProfileUseCase;
  const mockUserId = createUserId('user-123');
  const mockRequestingUserId = createUserId('requester-456');

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ShareProfileUseCase(
      mockUserRepository as any,
      mockJWTService as any,
      mockCache as any,
      mockAnalytics as any,
      mockAuditLogger as any
    );
  });

  describe('Input Validation', () => {
    it('should reject invalid expiresIn values', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 100 // Too short
      };

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should accept valid input', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        name: 'Test User',
        profileVisibility: ProfileVisibility.PUBLIC
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute(input);
      expect(result.url).toBe('/@testuser');
    });
  });

  describe('Permission Checks', () => {
    it('should allow owner to share private profile', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockUserId, // Same user
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        name: 'Test User',
        profileVisibility: ProfileVisibility.PRIVATE
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJWTService.sign.mockReturnValue('signed-token');

      const result = await useCase.execute(input);
      expect(result.url).toBe('/share/signed-token');
      expect(result.isPublic).toBe(false);
    });

    it('should deny non-owner sharing private profile', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId, // Different user
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        profileVisibility: ProfileVisibility.PRIVATE
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(useCase.execute(input)).rejects.toThrow(AuthorizationError);
    });

    it('should allow anyone to share public profile', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        profileVisibility: ProfileVisibility.PUBLIC
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute(input);
      expect(result.url).toBe('/@testuser');
      expect(result.isPublic).toBe(true);
    });
  });

  describe('URL Generation', () => {
    it('should generate canonical URL for public profiles', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'publicuser',
        name: 'Public User',
        profileVisibility: ProfileVisibility.PUBLIC
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute(input);

      expect(result.url).toBe('/@publicuser');
      expect(result.isPublic).toBe(true);
      expect(result.expiresAt).toBeUndefined();
      expect(result.metadata.username).toBe('publicuser');
      expect(result.metadata.title).toContain('Public User');
    });

    it('should generate signed URL for unlisted profiles', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 7200
      };

      const mockUser = {
        id: mockUserId,
        username: 'unlisteduser',
        profileVisibility: ProfileVisibility.UNLISTED
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJWTService.sign.mockReturnValue('jwt-token-123');

      const result = await useCase.execute(input);

      expect(result.url).toBe('/share/jwt-token-123');
      expect(result.isPublic).toBe(false);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockJWTService.sign).toHaveBeenCalledWith(
        {
          userId: mockUserId,
          type: 'profile_share',
          exp: expect.any(Number)
        },
        7200
      );
    });

    it('should store token in Redis for unlisted profiles', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 1800
      };

      const mockUser = {
        id: mockUserId,
        username: 'unlisteduser',
        profileVisibility: ProfileVisibility.UNLISTED
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJWTService.sign.mockReturnValue('redis-token');

      await useCase.execute(input);

      expect(mockCache.set).toHaveBeenCalledWith(
        'share_token:redis-token',
        mockUserId,
        1800
      );
    });
  });

  describe('Analytics and Audit', () => {
    it('should track share event', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        profileVisibility: ProfileVisibility.PUBLIC
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await useCase.execute(input);

      expect(mockAnalytics.track).toHaveBeenCalledWith(
        'profile_shared',
        mockRequestingUserId,
        {
          sharedUserId: mockUserId,
          visibility: ProfileVisibility.PUBLIC,
          isPublic: true
        }
      );
    });

    it('should create audit log entry', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        profileVisibility: ProfileVisibility.UNLISTED
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJWTService.sign.mockReturnValue('audit-token');

      await useCase.execute(input);

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'profile.shared',
        mockRequestingUserId,
        {
          sharedUserId: mockUserId,
          visibility: ProfileVisibility.UNLISTED,
          url: '/share/audit-token',
          expiresAt: expect.any(Date)
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundError for non-existent user', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('should use default expiresIn when not provided', async () => {
      const input = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId
        // expiresIn not provided, should default to 3600
      } as ShareProfileDTO;

      const mockUser = {
        id: mockUserId,
        username: 'testuser',
        profileVisibility: ProfileVisibility.UNLISTED
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJWTService.sign.mockReturnValue('default-token');

      await useCase.execute(input);

      expect(mockJWTService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        3600 // Default value
      );
    });
  });

  describe('Metadata Generation', () => {
    it('should generate proper Open Graph metadata', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'metauser',
        name: 'Meta User',
        profileVisibility: ProfileVisibility.PUBLIC
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute(input);

      expect(result.metadata).toEqual({
        title: "Meta User's Reading Profile",
        description: "Check out metauser's reading collection on ReadFlex",
        username: 'metauser'
      });
    });

    it('should handle missing name in metadata', async () => {
      const input: ShareProfileDTO = {
        userId: mockUserId,
        requestingUserId: mockRequestingUserId,
        expiresIn: 3600
      };

      const mockUser = {
        id: mockUserId,
        username: 'noname',
        name: undefined,
        profileVisibility: ProfileVisibility.PUBLIC
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute(input);

      expect(result.metadata.title).toBe("noname's Reading Profile");
    });
  });
});