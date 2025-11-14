// @ts-nocheck
import { PrismaClient, User as PrismaUser, Prisma } from '@prisma/client';
import { IUserRepository } from '../../core/repositories/IUserRepository';
import { User, UserId, createUserId } from '../../core/entities/User';
import { NotFoundError, ConflictError, createNotFound } from '../../shared/types/errors';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const prismaUser = await this.prisma.user.create({
        data: {
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          isPublic: user.isPublic,
          readingStreak: user.readingStreak,
          totalItemsRead: user.totalItemsRead,
          version: 1
        }
      });

      return this.toDomainEntity(prismaUser);
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
      where: { id }
    });

    return prismaUser ? this.toDomainEntity(prismaUser) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { username }
    });

    return prismaUser ? this.toDomainEntity(prismaUser) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { email }
    });

    return prismaUser ? this.toDomainEntity(prismaUser) : null;
  }

  async update(id: UserId, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
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
          updatedAt: new Date()
        }
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

  async updateStats(id: UserId, stats: { readingStreak?: number; totalItemsRead?: number }): Promise<void> {
    try {
      // Optimistic locking with version increment
      const result = await this.prisma.user.updateMany({
        where: { 
          id,
          // Add version check for optimistic locking if needed
        },
        data: {
          readingStreak: stats.readingStreak,
          totalItemsRead: stats.totalItemsRead,
          updatedAt: new Date(),
          version: { increment: 1 }
        }
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
        where: { id }
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
      updatedAt: prismaUser.updatedAt
    });
  }
}