import { UpdateReadingStreakUseCase } from './UpdateReadingStreakUseCase';
import { createUserId } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { IItemRepository } from '../repositories/IItemRepository';

// Mock dependencies
const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  updateStats: jest.fn(),
  incrementStats: jest.fn(),
};

const mockItemRepository: jest.Mocked<IItemRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  search: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countByUserInTimeWindow: jest.fn(),
  transaction: jest.fn(),
  searchWithRawQuery: jest.fn(),
  executeRawQuery: jest.fn(),
};

const mockAnalyticsLogger = {
  track: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('UpdateReadingStreakUseCase', () => {
  let useCase: UpdateReadingStreakUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Set fixed date: March 15, 2024 12:00 UTC
    jest.setSystemTime(new Date('2024-03-15T12:00:00.000Z'));

    useCase = new UpdateReadingStreakUseCase(
      mockUserRepository,
      mockItemRepository,
      mockAnalyticsLogger,
      mockLogger
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('executeBatch', () => {
    it('should handle empty user list', async () => {
      await useCase.executeBatch([]);

      expect(mockItemRepository.executeRawQuery).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should increment streak for users with reads yesterday', async () => {
      const userIds = [createUserId('user1'), createUserId('user2')];
      
      // Mock users with reads yesterday
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([
          { userId: 'user1', currentStreak: 5 },
          { userId: 'user2', currentStreak: 0 },
        ])
        .mockResolvedValueOnce([]); // Update query

      await useCase.executeBatch(userIds);

      // Verify query for users with reads
      expect(mockItemRepository.executeRawQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT'),
        [
          'user1',
          'user2',
          '2024-03-14T00:00:00.000Z', // Yesterday UTC
          '2024-03-15T00:00:00.000Z', // Today UTC
        ]
      );

      // Verify batch update query
      expect(mockItemRepository.executeRawQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([
          'user1', 'user2', // CASE conditions
          '2024-03-15T00:00:00.000Z', // lastReadDate
          '2024-03-15T00:00:00.000Z', // updatedAt
          'user1', 'user2', // WHERE IN
        ])
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Streak update completed', {
        totalUsers: 2,
        usersWithReads: 2,
        usersReset: 0,
      });
    });

    it('should reset streak for users without reads yesterday', async () => {
      const userIds = [createUserId('user1'), createUserId('user2')];
      
      // Mock no users with reads yesterday
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([]) // No reads found
        .mockResolvedValueOnce([]); // Update query

      await useCase.executeBatch(userIds);

      // Verify batch update resets both users
      expect(mockItemRepository.executeRawQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHEN id = ? THEN 0'),
        expect.arrayContaining(['user1', 'user2'])
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Streak update completed', {
        totalUsers: 2,
        usersWithReads: 0,
        usersReset: 2,
      });
    });

    it('should handle mixed scenario - some users with reads, some without', async () => {
      const userIds = [createUserId('user1'), createUserId('user2'), createUserId('user3')];
      
      // Mock only user1 has reads yesterday
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([
          { userId: 'user1', currentStreak: 10 },
        ])
        .mockResolvedValueOnce([]);

      await useCase.executeBatch(userIds);

      expect(mockLogger.info).toHaveBeenCalledWith('Streak update completed', {
        totalUsers: 3,
        usersWithReads: 1,
        usersReset: 2,
      });
    });

    it('should track milestone achievements', async () => {
      const userIds = [createUserId('user1'), createUserId('user2')];
      
      // Mock users approaching milestones
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([
          { userId: 'user1', currentStreak: 6 }, // Will reach 7-day milestone
          { userId: 'user2', currentStreak: 29 }, // Will reach 30-day milestone
        ])
        .mockResolvedValueOnce([]);

      await useCase.executeBatch(userIds);

      // Verify milestone tracking
      expect(mockAnalyticsLogger.track).toHaveBeenCalledWith(
        'streak_milestone_achieved',
        'user1',
        {
          streakDays: 7,
          milestone: 'week_warrior',
          timestamp: '2024-03-15T12:00:00.000Z',
        }
      );

      expect(mockAnalyticsLogger.track).toHaveBeenCalledWith(
        'streak_milestone_achieved',
        'user2',
        {
          streakDays: 30,
          milestone: 'monthly_master',
          timestamp: '2024-03-15T12:00:00.000Z',
        }
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Streak milestone achieved', {
        userId: 'user1',
        streakDays: 7,
        milestone: 'week_warrior',
      });
    });

    it('should handle all milestone types', async () => {
      const userIds = [
        createUserId('user1'),
        createUserId('user2'),
        createUserId('user3'),
        createUserId('user4'),
      ];
      
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([
          { userId: 'user1', currentStreak: 6 },   // 7 days
          { userId: 'user2', currentStreak: 99 },  // 100 days
          { userId: 'user3', currentStreak: 364 }, // 365 days
          { userId: 'user4', currentStreak: 50 },  // No milestone
        ])
        .mockResolvedValueOnce([]);

      await useCase.executeBatch(userIds);

      expect(mockAnalyticsLogger.track).toHaveBeenCalledTimes(3);
      expect(mockAnalyticsLogger.track).toHaveBeenCalledWith(
        'streak_milestone_achieved',
        'user2',
        expect.objectContaining({ milestone: 'century_scholar' })
      );
      expect(mockAnalyticsLogger.track).toHaveBeenCalledWith(
        'streak_milestone_achieved',
        'user3',
        expect.objectContaining({ milestone: 'yearly_champion' })
      );
    });

    it('should be idempotent - handle multiple runs safely', async () => {
      const userIds = [createUserId('user1')];
      
      mockItemRepository.executeRawQuery
        .mockResolvedValue([{ userId: 'user1', currentStreak: 5 }])
        .mockResolvedValueOnce([]);

      // Run twice
      await useCase.executeBatch(userIds);
      await useCase.executeBatch(userIds);

      // Should execute queries both times (idempotent)
      expect(mockItemRepository.executeRawQuery).toHaveBeenCalledTimes(4);
    });

    it('should handle DST edge cases with UTC timezone', async () => {
      // Test during DST transition (Spring forward)
      jest.setSystemTime(new Date('2024-03-10T07:00:00.000Z')); // DST starts in US

      const userIds = [createUserId('user1')];
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await useCase.executeBatch(userIds);

      // Verify UTC dates are used (not affected by DST)
      expect(mockItemRepository.executeRawQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '2024-03-09T00:00:00.000Z', // Yesterday UTC
          '2024-03-10T00:00:00.000Z', // Today UTC
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      const userIds = [createUserId('user1')];
      const dbError = new Error('Database connection failed');
      
      mockItemRepository.executeRawQuery.mockRejectedValueOnce(dbError);

      await expect(useCase.executeBatch(userIds)).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update reading streaks',
        dbError
      );
    });

    it('should handle large batch sizes efficiently', async () => {
      // Test with 1000 users
      const userIds = Array.from({ length: 1000 }, (_, i) => createUserId(`user${i}`));
      
      mockItemRepository.executeRawQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await useCase.executeBatch(userIds);

      // Verify single batch query (not N+1)
      expect(mockItemRepository.executeRawQuery).toHaveBeenCalledTimes(2);
      
      // Verify batch update includes all users
      const updateCall = mockItemRepository.executeRawQuery.mock.calls[1];
      expect(updateCall[0]).toContain('WHERE id IN');
      expect(updateCall[1]).toHaveLength(2002); // 1000 (cases) + 2 (dates) + 1000 (WHERE IN)
    });
  });
});