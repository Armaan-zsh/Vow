// Branded types for type safety
export type UserId = string & { __brand: 'UserId' };

export enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

export interface UserStats {
  readonly totalItems: number;
  readonly booksCount: number;
  readonly papersCount: number;
  readonly articlesCount: number;
  readonly streakDays: number;
  readonly lastReadDate: Date | null;
}

export interface UserConstructorProps {
  id: UserId;
  username: string;
  email?: string;
  phone?: string;
  name?: string;
  profileVisibility?: ProfileVisibility;
  isVerified?: boolean;
  stats?: Partial<UserStats>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private readonly _id: UserId;
  private readonly _username: string;
  private readonly _email?: string;
  private readonly _phone?: string;
  private readonly _name?: string;
  private readonly _profileVisibility: ProfileVisibility;
  private readonly _isVerified: boolean;
  private readonly _stats: UserStats;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  constructor(props: UserConstructorProps) {
    this.validateUsername(props.username);

    this._id = props.id;
    this._username = props.username;
    this._email = props.email;
    this._phone = props.phone;
    this._name = props.name;
    this._profileVisibility = props.profileVisibility ?? ProfileVisibility.PUBLIC;
    this._isVerified = props.isVerified ?? false;
    this._stats = {
      totalItems: props.stats?.totalItems ?? 0,
      booksCount: props.stats?.booksCount ?? 0,
      papersCount: props.stats?.papersCount ?? 0,
      articlesCount: props.stats?.articlesCount ?? 0,
      streakDays: props.stats?.streakDays ?? 0,
      lastReadDate: props.stats?.lastReadDate ?? null,
    };
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  get id(): UserId {
    return this._id;
  }
  get username(): string {
    return this._username;
  }
  get email(): string | undefined {
    return this._email;
  }
  get phone(): string | undefined {
    return this._phone;
  }
  get name(): string | undefined {
    return this._name;
  }
  get profileVisibility(): ProfileVisibility {
    return this._profileVisibility;
  }
  get isVerified(): boolean {
    return this._isVerified;
  }
  get stats(): UserStats {
    return { ...this._stats };
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business logic methods
  canFollow(targetUserId: UserId): boolean {
    return this._id !== targetUserId;
  }

  isProfilePublic(): boolean {
    return this._profileVisibility === ProfileVisibility.PUBLIC;
  }

  incrementStreak(): User {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const shouldIncrement =
      !this._stats.lastReadDate ||
      this._stats.lastReadDate.toDateString() === yesterday.toDateString();

    return new User({
      id: this._id,
      username: this._username,
      email: this._email,
      phone: this._phone,
      name: this._name,
      profileVisibility: this._profileVisibility,
      isVerified: this._isVerified,
      stats: {
        ...this._stats,
        streakDays: shouldIncrement ? this._stats.streakDays + 1 : 1,
        lastReadDate: today,
      },
      createdAt: this._createdAt,
      updatedAt: new Date(),
    });
  }

  private validateUsername(username: string): void {
    if (!username || username.trim().length === 0) {
      throw new Error('Username is required');
    }

    if (username.length > 39) {
      throw new Error('Username must be 39 characters or less');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }
}

// Helper function to create UserId
export function createUserId(id: string): UserId {
  return id as UserId;
}

// Extend User class with static method
declare module './User' {
  namespace User {
    function create(props: Omit<UserConstructorProps, 'id'>): User;
  }
}

(User as any).create = function (props: Omit<UserConstructorProps, 'id'>) {
  return new User({
    ...props,
    id: createUserId(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  });
};
