import { IUserRepository } from './IUserRepository';
import { User, UserId, UserStats, createUserId } from '../entities/User';

/**
 * Mock implementation of IUserRepository for unit testing
 * Provides in-memory storage with full repository functionality
 */
export class MockUserRepository implements IUserRepository {
  public data = new Map<string, User>();
  private get users() {
    return this.data;
  }

  async create(user: User): Promise<void> {
    // Check for duplicate username
    const existingByUsername = await this.findByUsername(user.username);
    if (existingByUsername) {
      throw new Error(`Username '${user.username}' already exists`);
    }

    // Check for duplicate email
    if (user.email) {
      const existingByEmail = await this.findByEmail(user.email);
      if (existingByEmail) {
        throw new Error(`Email '${user.email}' already exists`);
      }
    }

    this.users.set(user.id, user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async updateStats(userId: UserId, stats: Partial<UserStats>): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User with id '${userId}' not found`);
    }

    // Create new user with updated stats
    const updatedUser = new User({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.name,
      profileVisibility: user.profileVisibility,
      isVerified: user.isVerified,
      stats: { ...user.stats, ...stats },
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });

    this.users.set(userId, updatedUser);
  }

  async incrementStats(userId: UserId, increments: Record<string, number>): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User with id '${userId}' not found`);
    }

    const updatedStats = { ...user.stats };
    for (const [key, value] of Object.entries(increments)) {
      const currentValue = updatedStats[key as keyof UserStats];
      if (typeof currentValue === 'number') {
        (updatedStats as any)[key] = currentValue + value;
      } else {
        (updatedStats as any)[key] = value;
      }
    }

    await this.updateStats(userId, updatedStats);
  }

  // Test helper methods
  clear(): void {
    this.users.clear();
  }

  size(): number {
    return this.users.size;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}
