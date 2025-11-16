import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../../../src/infrastructure/database/PrismaUserRepository';
import { PrismaItemRepository } from '../../../../src/infrastructure/database/PrismaItemRepository';
import { ItemType } from '../../../../src/core/entities/Item';

const prisma = new PrismaClient();
const userRepo = new PrismaUserRepository(prisma);
const itemRepo = new PrismaItemRepository(prisma);

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // Find user
    const user = await userRepo.findByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const cursor = searchParams.get('cursor') || undefined;
    const type = searchParams.get('type') as ItemType | undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter options
    const filterOptions: any = {};
    if (type) filterOptions.type = type;
    if (tags.length > 0) filterOptions.tags = tags;
    if (startDate || endDate) {
      filterOptions.dateRange = {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined,
      };
    }

    // Get items
    const result = await itemRepo.findByUserId(user.id, { limit, cursor });

    // Convert items to DTO format
    const items = result.items.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      rating: item.rating,
      author: item.author,
      coverImage: item.coverImage,
      url: item.url,
      publishedYear: item.publishedYear,
      notes: item.notes,
      readDate: item.readDate?.toISOString(),
      addedAt: item.addedAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      tags: [], // TODO: Implement tags when available
      isPublic: item.isPublic,
    }));

    return NextResponse.json({
      items,
      nextCursor: result.nextCursor,
      hasNextPage: result.hasNextPage,
    });
  } catch (error) {
    console.error('Error fetching user items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
