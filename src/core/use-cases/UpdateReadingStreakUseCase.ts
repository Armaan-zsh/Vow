import { UserId } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { IItemRepository } from '../repositories/IItemRepository';

interface AnalyticsLogger {
  track(event: string, userId: UserId, properties: Record<string, any>): Promise<void>;
}

interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error): void;
}

export class UpdateReadingStreakUseCase {
  constructor(
    private userRepository: IUserRepository,
    private itemRepository: IItemRepository,
    private analyticsLogger: AnalyticsLogger,
    private logger: Logger
  ) {}

  async executeBatch(userIds: UserId[]): Promise<void> {
    if (userIds.length === 0) return;

    const yesterday = this.getYesterdayUTC();
    const today = this.getTodayUTC();

    try {
      // Batch query: Find users with reads in last 24h
      const usersWithReads = await this.getUsersWithReadsYesterday(userIds, yesterday, today);
      const userIdsWithReads = new Set(usersWithReads.map(u => u.userId));

      // Batch update streaks
      await this.batchUpdateStreaks(userIds, userIdsWithReads, today);

      // Log milestone achievements
      await this.logMilestoneAchievements(usersWithReads);

      this.logger.info('Streak update completed', {
        totalUsers: userIds.length,
        usersWithReads: userIdsWithReads.size,
        usersReset: userIds.length - userIdsWithReads.size,
      });
    } catch (error) {
      this.logger.error('Failed to update reading streaks', error as Error);
      throw error;
    }
  }

  private async getUsersWithReadsYesterday(
    userIds: UserId[],
    yesterday: Date,
    today: Date
  ): Promise<Array<{ userId: UserId; currentStreak: number }>> {
    const placeholders = userIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT 
        i.userId,
        COALESCE(u.streakDays, 0) as currentStreak
      FROM items i
      JOIN users u ON i.userId = u.id
      WHERE i.userId IN (${placeholders})
        AND i.readDate >= ? 
        AND i.readDate < ?
    `;

    const params = [...userIds, yesterday.toISOString(), today.toISOString()];
    const results = await this.itemRepository.executeRawQuery(query, params);

    return results.map(row => ({
      userId: row.userId as UserId,
      currentStreak: row.currentStreak,
    }));
  }

  private async batchUpdateStreaks(
    allUserIds: UserId[],
    userIdsWithReads: Set<UserId>,
    today: Date
  ): Promise<void> {
    // Build batch update query
    const cases: string[] = [];
    const params: any[] = [];

    for (const userId of allUserIds) {
      if (userIdsWithReads.has(userId)) {
        // Increment streak
        cases.push('WHEN id = ? THEN COALESCE(streakDays, 0) + 1');
        params.push(userId);
      } else {
        // Reset streak
        cases.push('WHEN id = ? THEN 0');
        params.push(userId);
      }
    }

    const placeholders = allUserIds.map(() => '?').join(',');
    const query = `
      UPDATE users 
      SET 
        streakDays = CASE ${cases.join(' ')} END,
        lastReadDate = ?,
        updatedAt = ?
      WHERE id IN (${placeholders})
    `;

    const finalParams = [...params, today.toISOString(), today.toISOString(), ...allUserIds];
    await this.itemRepository.executeRawQuery(query, finalParams);
  }

  private async logMilestoneAchievements(
    usersWithReads: Array<{ userId: UserId; currentStreak: number }>
  ): Promise<void> {
    const milestones = [7, 30, 100, 365];

    for (const user of usersWithReads) {
      const newStreak = user.currentStreak + 1;
      
      if (milestones.includes(newStreak)) {
        await this.analyticsLogger.track('streak_milestone_achieved', user.userId, {
          streakDays: newStreak,
          milestone: this.getMilestoneName(newStreak),
          timestamp: new Date().toISOString(),
        });

        this.logger.info('Streak milestone achieved', {
          userId: user.userId,
          streakDays: newStreak,
          milestone: this.getMilestoneName(newStreak),
        });
      }
    }
  }

  private getMilestoneName(days: number): string {
    switch (days) {
      case 7: return 'week_warrior';
      case 30: return 'monthly_master';
      case 100: return 'century_scholar';
      case 365: return 'yearly_champion';
      default: return 'unknown';
    }
  }

  private getYesterdayUTC(): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private getTodayUTC(): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}