import { MockUserRepository } from '../../../src/core/repositories/MockUserRepository';
import { User, createUserId, ProfileVisibility } from '../../../src/core/entities/User';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MockUserRepository', () => {
  let repository: MockUserRepository;
  let testUser: User;

  beforeEach(() => {
    repository = new MockUserRepository();
    testUser = new User({
      id: createUserId('user-1'),
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      await repository.create(testUser);

      expect(repository.size()).toBe(1);
      expect(repository.getAllUsers()).toContain(testUser);
    });

    it('should throw error for duplicate username', async () => {
      await repository.create(testUser);

      const duplicateUser = new User({
        id: createUserId('user-2'),
        username: 'testuser',
        email: 'different@example.com',
      });

      await expect(repository.create(duplicateUser)).rejects.toThrow(
        "Username 'testuser' already exists"
      );
    });

    it('should throw error for duplicate email', async () => {
      await repository.create(testUser);

      const duplicateUser = new User({
        id: createUserId('user-2'),
        username: 'differentuser',
        email: 'test@example.com',
      });

      await expect(repository.create(duplicateUser)).rejects.toThrow(
        "Email 'test@example.com' already exists"
      );
    });

    it('should allow users without email', async () => {
      const userWithoutEmail = new User({
        id: createUserId('user-2'),
        username: 'noemailer',
      });

      await repository.create(testUser);
      await expect(repository.create(userWithoutEmail)).resolves.not.toThrow();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      await repository.create(testUser);

      const found = await repository.findById(testUser.id);
      expect(found).toEqual(testUser);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById(createUserId('nonexistent'));
      expect(found).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      await repository.create(testUser);

      const found = await repository.findByUsername('testuser');
      expect(found).toEqual(testUser);
    });

    it('should return null when not found', async () => {
      const found = await repository.findByUsername('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      await repository.create(testUser);

      const found = await repository.findByEmail('test@example.com');
      expect(found).toEqual(testUser);
    });

    it('should return null when not found', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });

    it('should return null for user without email', async () => {
      const userWithoutEmail = new User({
        id: createUserId('user-2'),
        username: 'noemailer',
      });
      await repository.create(userWithoutEmail);

      const found = await repository.findByEmail('any@example.com');
      expect(found).toBeNull();
    });
  });

  describe('updateStats', () => {
    beforeEach(async () => {
      await repository.create(testUser);
    });

    it('should update user stats', async () => {
      const newStats = {
        totalItems: 10,
        booksCount: 5,
        streakDays: 3,
      };

      await repository.updateStats(testUser.id, newStats);

      const updated = await repository.findById(testUser.id);
      expect(updated!.stats.totalItems).toBe(10);
      expect(updated!.stats.booksCount).toBe(5);
      expect(updated!.stats.streakDays).toBe(3);
      expect(updated!.stats.papersCount).toBe(0);
    });

    it('should update timestamp', async () => {
      jest.advanceTimersByTime(1000);

      await repository.updateStats(testUser.id, { totalItems: 1 });

      const updated = await repository.findById(testUser.id);
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(testUser.updatedAt.getTime());
    });

    it('should throw error for nonexistent user', async () => {
      const nonexistentId = createUserId('nonexistent');

      await expect(repository.updateStats(nonexistentId, { totalItems: 1 })).rejects.toThrow(
        "User with id 'nonexistent' not found"
      );
    });
  });

  describe('test helpers', () => {
    it('should clear all users', async () => {
      await repository.create(testUser);
      expect(repository.size()).toBe(1);

      repository.clear();
      expect(repository.size()).toBe(0);
    });

    it('should return all users', async () => {
      const user2 = new User({
        id: createUserId('user-2'),
        username: 'user2',
      });

      await repository.create(testUser);
      await repository.create(user2);

      const allUsers = repository.getAllUsers();
      expect(allUsers).toHaveLength(2);
      expect(allUsers).toContain(testUser);
      expect(allUsers).toContain(user2);
    });
  });
});
