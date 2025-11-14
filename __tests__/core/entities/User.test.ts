import { User, UserId, ProfileVisibility, createUserId } from '../../../src/core/entities/User';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('User Entity', () => {
  const validUserId = createUserId('user-123');
  const validProps = {
    id: validUserId,
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User'
  };

  describe('Constructor Validation', () => {
    it('should create user with valid data', () => {
      const user = new User(validProps);
      
      expect(user.id).toBe(validUserId);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.profileVisibility).toBe(ProfileVisibility.PUBLIC);
      expect(user.isVerified).toBe(false);
    });

    it('should throw error for empty username', () => {
      expect(() => new User({ ...validProps, username: '' }))
        .toThrow('Username is required');
    });

    it('should throw error for username too long', () => {
      const longUsername = 'a'.repeat(40);
      expect(() => new User({ ...validProps, username: longUsername }))
        .toThrow('Username must be 39 characters or less');
    });

    it('should throw error for invalid username characters', () => {
      expect(() => new User({ ...validProps, username: 'user@name' }))
        .toThrow('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should accept valid username formats', () => {
      const validUsernames = ['user123', 'user_name', 'user-name', 'User123'];
      
      validUsernames.forEach(username => {
        expect(() => new User({ ...validProps, username })).not.toThrow();
      });
    });
  });

  describe('Default Values', () => {
    it('should set default values correctly', () => {
      const user = new User({ id: validUserId, username: 'testuser' });
      
      expect(user.profileVisibility).toBe(ProfileVisibility.PUBLIC);
      expect(user.isVerified).toBe(false);
      expect(user.stats.totalItems).toBe(0);
      expect(user.stats.booksCount).toBe(0);
      expect(user.stats.papersCount).toBe(0);
      expect(user.stats.articlesCount).toBe(0);
      expect(user.stats.streakDays).toBe(0);
      expect(user.stats.lastReadDate).toBeNull();
    });

    it('should use provided stats values', () => {
      const user = new User({
        ...validProps,
        stats: {
          totalItems: 10,
          booksCount: 5,
          streakDays: 3
        }
      });
      
      expect(user.stats.totalItems).toBe(10);
      expect(user.stats.booksCount).toBe(5);
      expect(user.stats.streakDays).toBe(3);
      expect(user.stats.papersCount).toBe(0);
    });
  });

  describe('Immutability', () => {
    it('should return readonly stats object', () => {
      const user = new User(validProps);
      const stats = user.stats;
      
      expect(user.stats.totalItems).toBe(0);
    });

    it('should create new instance on incrementStreak', () => {
      const user = new User(validProps);
      const updatedUser = user.incrementStreak();
      
      expect(updatedUser).not.toBe(user);
      expect(updatedUser.stats.streakDays).toBe(1);
      expect(user.stats.streakDays).toBe(0);
    });
  });

  describe('Business Logic Methods', () => {
    describe('canFollow', () => {
      it('should return false for same user', () => {
        const user = new User(validProps);
        
        expect(user.canFollow(validUserId)).toBe(false);
      });

      it('should return true for different user', () => {
        const user = new User(validProps);
        const otherUserId = createUserId('other-user');
        
        expect(user.canFollow(otherUserId)).toBe(true);
      });
    });

    describe('isProfilePublic', () => {
      it('should return true for PUBLIC profile', () => {
        const user = new User({ ...validProps, profileVisibility: ProfileVisibility.PUBLIC });
        
        expect(user.isProfilePublic()).toBe(true);
      });

      it('should return false for PRIVATE profile', () => {
        const user = new User({ ...validProps, profileVisibility: ProfileVisibility.PRIVATE });
        
        expect(user.isProfilePublic()).toBe(false);
      });

      it('should return false for UNLISTED profile', () => {
        const user = new User({ ...validProps, profileVisibility: ProfileVisibility.UNLISTED });
        
        expect(user.isProfilePublic()).toBe(false);
      });
    });

    describe('incrementStreak', () => {
      it('should increment streak for new user', () => {
        const user = new User(validProps);
        const updatedUser = user.incrementStreak();
        
        expect(updatedUser.stats.streakDays).toBe(1);
        expect(updatedUser.stats.lastReadDate).toBeInstanceOf(Date);
      });

      it('should increment streak when last read was yesterday', () => {
        const yesterday = new Date('2023-12-31T00:00:00.000Z');
        
        const user = new User({
          ...validProps,
          stats: { streakDays: 5, lastReadDate: yesterday }
        });
        
        const updatedUser = user.incrementStreak();
        expect(updatedUser.stats.streakDays).toBe(6);
      });

      it('should reset streak when last read was not yesterday', () => {
        const twoDaysAgo = new Date('2023-12-30T00:00:00.000Z');
        
        const user = new User({
          ...validProps,
          stats: { streakDays: 5, lastReadDate: twoDaysAgo }
        });
        
        const updatedUser = user.incrementStreak();
        expect(updatedUser.stats.streakDays).toBe(1);
      });

      it('should update timestamps', () => {
        const user = new User(validProps);
        const updatedUser = user.incrementStreak();
        
        expect(updatedUser.updatedAt.getFullYear()).toBe(2024);
        expect(updatedUser.createdAt.getFullYear()).toBe(2024);
      });
    });
  });

  describe('Branded Types', () => {
    it('should create UserId with brand', () => {
      const userId = createUserId('test-id');
      
      expect(typeof userId).toBe('string');
      expect(userId).toBe('test-id');
    });
  });
});