'use client';

import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useQueryStates } from 'nuqs';
import { parseAsString, parseAsArrayOf, parseAsIsoDateTime } from 'nuqs';
import { User } from '../../core/entities/User';
import { Item } from '../../core/entities/Item';
import { ItemType } from '../../core/entities/Item';
import { ItemCard } from './ItemCard';
import { ShareModal } from './ShareModal';
import { FollowButton } from './FollowButton';

interface ProfileClientProps {
  user: User;
  initialItems: Item[];
  initialNextCursor: string | null;
  initialHasNextPage: boolean;
}

export function ProfileClient({ user, initialItems, initialNextCursor, initialHasNextPage }: ProfileClientProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [filters, setFilters] = useQueryStates({
    type: parseAsString,
    tags: parseAsArrayOf(parseAsString),
    start: parseAsIsoDateTime,
    end: parseAsIsoDateTime,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['profile', user.username, filters],
    queryFn: async ({ pageParam = null }) => {
      const searchParams = new URLSearchParams();
      if (filters.type) searchParams.set('type', filters.type);
      if (filters.tags) searchParams.set('tags', filters.tags.join(','));
      if (filters.start) searchParams.set('start', filters.start.toISOString());
      if (filters.end) searchParams.set('end', filters.end.toISOString());
      if (pageParam) searchParams.set('cursor', pageParam);

      const response = await fetch(`/api/users/${user.username}/items?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      return response.json();
    },
    initialData: {
      pages: [{ items: initialItems, nextCursor: initialNextCursor, hasNextPage: initialHasNextPage }],
      pageParams: [null],
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const allItems = data?.pages.flatMap(page => page.items) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name || user.username}
                className="w-20 h-20 rounded-full border-2 border-black"
              />
            )}
            <div>
              <h1 className="text-3xl font-black font-mono">{user.name || user.username}</h1>
              <p className="text-gray-600 mt-1">@{user.username}</p>
              {user.bio && <p className="mt-2">{user.bio}</p>}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 border-2 border-black bg-[#FFD23F] hover:bg-[#FFD23F]/80 font-black font-mono"
            >
              SHARE
            </button>
            <FollowButton userId={user.id} />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center border-2 border-black p-4">
            <div className="text-2xl font-black font-mono">{user.stats.totalItems}</div>
            <div className="text-sm font-mono">TOTAL ITEMS</div>
          </div>
          <div className="text-center border-2 border-black p-4">
            <div className="text-2xl font-black font-mono">{user.stats.streakDays}</div>
            <div className="text-sm font-mono">DAY STREAK</div>
          </div>
          <div className="text-center border-2 border-black p-4">
            <div className="text-2xl font-black font-mono">{user.stats.followers || 0}</div>
            <div className="text-sm font-mono">FOLLOWERS</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 border-2 border-black p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-black font-mono mb-2">TYPE</label>
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ type: e.target.value || null })}
              className="w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <option value="">All Types</option>
              <option value="BOOK">Books</option>
              <option value="PAPER">Papers</option>
              <option value="ARTICLE">Articles</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-black font-mono mb-2">TAGS</label>
            <input
              type="text"
              placeholder="Enter tags separated by commas"
              value={filters.tags?.join(', ') || ''}
              onChange={(e) => setFilters({ tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : null })}
              className="w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
          <div>
            <label className="block text-sm font-black font-mono mb-2">START DATE</label>
            <input
              type="date"
              value={filters.start ? filters.start.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters({ start: e.target.value ? new Date(e.target.value) : null })}
              className="w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
          <div>
            <label className="block text-sm font-black font-mono mb-2">END DATE</label>
            <input
              type="date"
              value={filters.end ? filters.end.toISOString().split('T')[0] : ''}
              onChange={(e) => setFilters({ end: e.target.value ? new Date(e.target.value) : null })}
              className="w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
            className="px-6 py-3 border-2 border-black bg-[#FFD23F] hover:bg-[#FFD23F]/80 font-black font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          url={`${window.location.origin}/${user.username}`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
