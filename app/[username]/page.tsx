import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../src/infrastructure/database/PrismaUserRepository';
import { PrismaItemRepository } from '../../src/infrastructure/database/PrismaItemRepository';
import { GetUserProfileUseCase } from '../../src/core/use-cases/GetUserProfileUseCase';
import { MultiTierCache } from '../../src/infrastructure/cache/MultiTierCache';
import { ProfileClient } from '../../src/presentation/components/ProfileClient';
import { ProfileSkeleton } from '../../src/presentation/components/ProfileSkeleton';
import { ItemDTO } from '../../src/shared/types/ItemDTO';

const prisma = new PrismaClient();
const cache = new MultiTierCache();

// Convert Item entity to ItemDTO
function toItemDTO(item: any): ItemDTO {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    type: item.type,
    coverImage: item.coverImage,
    publishedYear: item.publishedYear,
    rating: item.rating,
    readDate: item.readDate?.toISOString(),
    status: item.status,
    tags: item.metadata?.tags || [],
    addedAt: item.addedAt.toISOString(),
  };
}

interface PageProps {
  params: { username: string };
  searchParams: {
    type?: string;
    tags?: string;
    start?: string;
    end?: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cacheKey = `user:${params.username}:metadata`;
  
  const user = await cache.get(cacheKey, async () => {
    const userRepo = new PrismaUserRepository(prisma);
    return await userRepo.findByUsername(params.username);
  }, 300); // 5 minute cache

  if (!user) {
    return {
      title: 'User Not Found',
      description: 'This user could not be found.',
    };
  }

  return {
    title: `${user.name || user.username} - ReadFlex Profile`,
    description: user.bio || `View ${user.name || user.username}'s reading profile and book collection`,
    openGraph: {
      title: `${user.name || user.username} - ReadFlex Profile`,
      description: user.bio || `View ${user.name || user.username}'s reading profile`,
      type: 'profile',
      images: user.avatarUrl ? [user.avatarUrl] : [],
    },
    twitter: {
      card: 'summary',
      title: `${user.name || user.username} - ReadFlex Profile`,
      description: user.bio || `View ${user.name || user.username}'s reading profile`,
    },
  };
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const cacheKey = `user:${params.username}:profile:${JSON.stringify(searchParams)}`;
  
  const result = await cache.get(cacheKey, async () => {
    const userRepo = new PrismaUserRepository(prisma);
    const itemRepo = new PrismaItemRepository(prisma);
    const useCase = new GetUserProfileUseCase(userRepo, itemRepo);

    const filter: any = {};
    if (searchParams.type) {
      filter.type = searchParams.type as any;
    }
    if (searchParams.tags) {
      filter.tags = searchParams.tags.split(',');
    }
    if (searchParams.start || searchParams.end) {
      filter.dateRange = {
        start: searchParams.start ? new Date(searchParams.start) : undefined,
        end: searchParams.end ? new Date(searchParams.end) : undefined,
      };
    }

    return await useCase.execute(params.username, {
      limit: 12,
      filter,
    });
  }, 300); // 5 minute cache

  if (!result) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfileClient
        user={result.user}
        initialItems={result.items.map(toItemDTO)}
        initialNextCursor={result.nextCursor}
        initialHasNextPage={result.hasNextPage}
      />
    </div>
  );
}
