// @ts-nocheck
import { PrismaClient, Prisma, PrismaUser } from '@prisma/client';
import { IUserRepository } from '../../core/repositories/IUserRepository';
import { User, UserId, createUserId, UserStats } from '../../core/entities/User';
import { createNotFound } from '../../shared/errors/createError';

// Type for Prisma error handling
interface PrismaKnownError extends Error {
  code?: string;
  meta?: any;
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(user: User): Promise<void> {
    try {
      await this.prisma.user.create({
        data: {
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          isPublic: user.isPublic,
          readingStreak: user.readingStreak,
          totalItemsRead: user.totalItemsRead,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])?.[0] || 'field';
          throw new ConflictError(`${field} already exists`);
        }
      }
      throw error;
    }
  }

  async findById(id: UserId): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { id },
    });

    return prismaUser ? this.toDomainEntity(prismaUser) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { username },
    });

    return prismaUser ? this.toDomainEntity(prismaUser) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { email },
    });

    return prismaUser ? this.toDomainEntity(prismaUser) : null;
  }

  async update(
    id: UserId,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          username: data.username,
          email: data.email,
          displayName: data.displayName,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          isPublic: data.isPublic,
          readingStreak: data.readingStreak,
          totalItemsRead: data.totalItemsRead,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw createNotFound('User', id);
        }
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])?.[0] || 'field';
          throw new ConflictError(`${field} already exists`);
        }
      }
      throw error;
    }
  }

  async updateStats(
    id: UserId,
    stats: Partial<UserStats>
  ): Promise<void> {
    try {
      // Optimistic locking with version increment
      const result = await this.prisma.user.updateMany({
        where: {
          id,
          // Add version check for optimistic locking if needed
        },
        data: {
          readingStreak: stats.streakDays,
          totalItemsRead: stats.totalItems,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw createNotFound('User', id);
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw createNotFound('User', id);
        }
      }
      throw error;
    }
  }

  async delete(id: UserId): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw createNotFound('User', id);
        }
      }
      throw error;
    }
  }

  async incrementStats(userId: UserId, increments: Record<string, number>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (increments.totalItems) {
        updateData.totalItemsRead = {
          increment: increments.totalItems
        };
      }
      
      if (increments.readingStreak) {
        updateData.readingStreak = {
          increment: increments.readingStreak
        };
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
      }
    } catch (error: unknown) {
      const prismaError = error as PrismaKnownError;
      if (prismaError.code === 'P2025') {
        throw new Error('User not found');
      }
      throw error;
    }
  }

  private toDomainEntity(prismaUser: PrismaUser): User {
    return new User({
      id: createUserId(prismaUser.id),
      username: prismaUser.username,
      email: prismaUser.email,
      displayName: prismaUser.displayName || undefined,
      bio: prismaUser.bio || undefined,
      avatarUrl: prismaUser.avatarUrl || undefined,
      isPublic: prismaUser.isPublic,
      readingStreak: prismaUser.readingStreak,
      totalItemsRead: prismaUser.totalItemsRead,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });
  }
}
