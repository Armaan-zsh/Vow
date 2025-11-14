import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../../src/infrastructure/database/PrismaUserRepository';
import { User, createUserId } from '../../../src/core/entities/User';
import { NotFoundError, ConflictError } from '../../../src/shared/types/errors';

describe('PrismaUserRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaUserRepository;
  let testUser: User;

  beforeAll(async () => {
    // In real implementation, use Testcontainers PostgreSQL
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
        }
      }
    });
    
    repository = new PrismaUserRepository(prisma);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.user.deleteMany();
    
    testUser = new User({
      id: createUserId('test-user-1'),
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      isPublic: true,
      readingStreak: 0,
      totalItemsRead: 0
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        bio: testUser.bio,
        avatarUrl: testUser.avatarUrl,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      const created = await repository.create(userData);

      expect(created.username).toBe(testUser.username);
      expect(created.email).toBe(testUser.email);
      expect(created.displayName).toBe(testUser.displayName);
      expect(created.id).toBeDefined();
      expect(created.createdAt).toBeDefined();
    });

    it('should throw ConflictError for duplicate username', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      await repository.create(userData);

      const duplicateData = {
        ...userData,
        email: 'different@example.com'
      };

      await expect(repository.create(duplicateData)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError for duplicate email', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      await repository.create(userData);

      const duplicateData = {
        ...userData,
        username: 'differentuser'
      };

      await expect(repository.create(duplicateData)).rejects.toThrow(ConflictError);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      const created = await repository.create(userData);
      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.username).toBe(testUser.username);
    });

    it('should return null for non-existent user', async () => {
      const found = await repository.findById(createUserId('non-existent'));
      expect(found).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      await repository.create(userData);
      const found = await repository.findByUsername(testUser.username);

      expect(found).toBeDefined();
      expect(found!.username).toBe(testUser.username);
    });

    it('should return null for non-existent username', async () => {
      const found = await repository.findByUsername('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      await repository.create(userData);
      const found = await repository.findByEmail(testUser.email);

      expect(found).toBeDefined();
      expect(found!.email).toBe(testUser.email);
    });

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('non-existent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      const created = await repository.create(userData);
      
      await repository.update(created.id, {
        displayName: 'Updated Name',
        bio: 'Updated bio'
      });

      const updated = await repository.findById(created.id);
      expect(updated!.displayName).toBe('Updated Name');
      expect(updated!.bio).toBe('Updated bio');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(repository.update(createUserId('non-existent'), {
        displayName: 'Updated Name'
      })).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStats', () => {
    it('should update user stats successfully', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      const created = await repository.create(userData);
      
      await repository.updateStats(created.id, {
        readingStreak: 5,
        totalItemsRead: 10
      });

      const updated = await repository.findById(created.id);
      expect(updated!.readingStreak).toBe(5);
      expect(updated!.totalItemsRead).toBe(10);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(repository.updateStats(createUserId('non-existent'), {
        readingStreak: 5
      })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userData = {
        username: testUser.username,
        email: testUser.email,
        displayName: testUser.displayName,
        isPublic: testUser.isPublic,
        readingStreak: testUser.readingStreak,
        totalItemsRead: testUser.totalItemsRead
      };

      const created = await repository.create(userData);
      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(repository.delete(createUserId('non-existent')))
        .rejects.toThrow(NotFoundError);
    });
  });
});