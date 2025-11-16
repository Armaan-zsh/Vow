'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FocusLock from 'react-focus-lock';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';
import { ItemType } from '../../core/entities/Item';
import { AddItemUseCase } from '../../core/use-cases/AddItemUseCase';
import { addItemSchema, AddItemFormData } from './AddItemModal/schema';
import { TypeSelector } from './AddItemModal/TypeSelector';
import { SearchResults } from './AddItemModal/SearchResults';
import { ManualForm } from './AddItemModal/ManualForm';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  addItemUseCase: AddItemUseCase;
  userId: string;
}

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

export function AddItemModal({ isOpen, onClose, addItemUseCase, userId }: AddItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { type: ItemType.BOOK },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (!isOpen) {
      reset();
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      performSearch(debouncedQuery, selectedType);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, selectedType]);

  const performSearch = async (query: string, type: ItemType) => {
    setIsSearching(true);
    try {
      // Mock search - replace with actual API calls
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: `${query} - Sample Result`,
          author: 'Sample Author',
          publishedYear: 2024,
          ...(type === ItemType.BOOK && { isbn: '9780123456789' }),
          ...(type === ItemType.PAPER && { doi: '10.1000/182' }),
          ...(type === ItemType.ARTICLE && { url: 'https://example.com' }),
        },
      ];
      setSearchResults(mockResults);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSelect = (result: SearchResult) => {
    setValue('title', result.title);
    setValue('author', result.author || '');
    if (result.isbn) setValue('isbn', result.isbn);
    if (result.doi) setValue('doi', result.doi);
    if (result.url) setValue('url', result.url);
    setSearchQuery('');
    setSearchResults([]);
  };

  const onSubmit = async (data: AddItemFormData) => {
    setIsSubmitting(true);
    try {
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      await addItemUseCase.execute({
        userId: userId as any,
        title: data.title,
        type: data.type,
        author: data.author || undefined,
        url: data.url || undefined,
        isbn: data.isbn || undefined,
        doi: data.doi || undefined,
        metadata: { tags, notes: data.notes, rating: data.rating, readDate: data.readDate },
      });

      toast.success('Item added successfully!');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
      <FocusLock>
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black font-mono">ADD NEW ITEM</h2>
              <button
                onClick={onClose}
                className="text-2xl font-black hover:bg-gray-100 w-8 h-8 flex items-center justify-center"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-black font-mono mb-2">SELECT TYPE</label>
                <TypeSelector
                  selectedType={selectedType}
                  onTypeChange={(type) => setValue('type', type)}
                />
              </div>

              <div>
                <label className="block text-sm font-black font-mono mb-2">SEARCH</label>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  placeholder={`Search by ${selectedType === ItemType.BOOK ? 'title or ISBN' : selectedType === ItemType.PAPER ? 'title or DOI' : 'title or URL'}`}
                />
                {(searchResults.length > 0 || isSearching) && (
                  <div className="mt-2 border-2 border-black">
                    <SearchResults
                      results={searchResults}
                      loading={isSearching}
                      onSelect={handleSearchSelect}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-black font-mono mb-2">MANUAL ENTRY</label>
                <ManualForm type={selectedType} register={register} errors={errors} />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 p-3 border-2 border-black bg-white hover:bg-gray-100 font-black font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 p-3 border-2 border-black bg-[#FFD23F] hover:bg-[#FFD23F]/80 font-black font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'ADDING...' : 'ADD ITEM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </FocusLock>
    </div>
  );
}