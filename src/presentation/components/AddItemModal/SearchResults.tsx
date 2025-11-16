import { memo } from 'react';

interface SearchResult {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  doi?: string;
  url?: string;
  coverImage?: string;
  publishedYear?: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  onSelect: (result: SearchResult) => void;
}

export const SearchResults = memo(function SearchResults({ results, loading, onSelect }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="p-4 text-center font-mono">
        <div className="animate-pulse">Searching...</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center font-mono text-gray-600">
        No results found. Try manual entry below.
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto space-y-2">
      {results.map((result) => (
        <button
          key={result.id}
          type="button"
          onClick={() => onSelect(result)}
          className="w-full p-3 border-2 border-black bg-white hover:bg-gray-100 text-left font-mono transition-colors"
        >
          <div className="font-black text-sm">{result.title}</div>
          {result.author && <div className="text-xs text-gray-600">{result.author}</div>}
          {result.publishedYear && <div className="text-xs text-gray-500">{result.publishedYear}</div>}
        </button>
      ))}
    </div>
  );
});