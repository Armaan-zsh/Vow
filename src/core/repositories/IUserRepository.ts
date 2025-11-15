import { User, UserId, UserStats } from '../entities/User';

/**
 * Repository interface for User entity operations
 * Follows the repository pattern with domain entities only
 */
export interface IUserRepository {
  /**
   * Creates a new user in the repository
   *
   * Pre-conditions:
   * - User entity must be valid (constructor validation passed)
   * - Username must be unique (implementation should handle conflicts)
   * - Email must be unique if provided (implementation should handle conflicts)
   *
   * Post-conditions:
   * - User is persisted in the repository
   * - User can be retrieved by id, username, or email
   *
   * @throws Error if username or email already exists
   */
  create(user: User): Promise<void>;

  /**
   * Finds a user by their unique identifier
   *
   * Pre-conditions:
   * - UserId must be a valid branded string
   *
   * Post-conditions:
   * - Returns User entity if found
   * - Returns null if not found (never throws)
   *
   * @param id - The unique user identifier
   * @returns User entity or null if not found
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Finds a user by their username
   *
   * Pre-conditions:
   * - Username must be a non-empty string
   *
   * Post-conditions:
   * - Returns User entity if found
   * - Returns null if not found (never throws)
   *
   * @param username - The username to search for
   * @returns User entity or null if not found
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Finds a user by their email address
   *
   * Pre-conditions:
   * - Email must be a non-empty string
   *
   * Post-conditions:
   * - Returns User entity if found
   * - Returns null if not found (never throws)
   *
   * @param email - The email address to search for
   * @returns User entity or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Updates user statistics
   *
   * Pre-conditions:
   * - UserId must exist in the repository
   * - Stats object must contain valid numeric values
   *
   * Post-conditions:
   * - User stats are updated with provided values
   * - Only provided stats fields are updated (partial update)
   * - updatedAt timestamp is refreshed
   *
   * @param userId - The user identifier
   * @param stats - Partial stats object with fields to update
   * @throws Error if user not found
   */
  updateStats(userId: UserId, stats: Partial<UserStats>): Promise<void>;

  /**
   * Increments user statistics atomically (idempotent)
   *
   * @param userId - The user identifier
   * @param increments - Stats fields to increment with their values
   */
  incrementStats(userId: UserId, increments: Record<string, number>): Promise<void>;
}
