import { useQuery } from '@tanstack/react-query';
import { ItemType } from '@/core/entities/Item';

export interface SearchResult {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  doi?: string;
  url?: string;
  coverImage?: string;
  publishedYear?: number;
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

async function searchItems(query: string, type: ItemType): Promise<SearchResponse> {
  if (!query || query.length < 2) {
    return { results: [] };
  }

  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

export function useItemSearch(query: string, type: ItemType, enabled: boolean) {
  return useQuery({
    queryKey: ['itemSearch', query, type],
    queryFn: () => searchItems(query, type),
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
}

