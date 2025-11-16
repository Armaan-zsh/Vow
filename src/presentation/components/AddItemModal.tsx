'use client';

import { useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import FocusLock from 'react-focus-lock';
import toast from 'react-hot-toast';
import { ItemType } from '@/core/entities/Item';
import { AddItemUseCase } from '@/core/use-cases/AddItemUseCase';
import { TypeSelector } from './AddItemModal/TypeSelector';
import { SearchResults } from './AddItemModal/SearchResults';
import { ManualForm } from './AddItemModal/ManualForm';
import { useItemSearch, SearchResult } from '../hooks/useItemSearch';
import { useAddItemForm } from './AddItemModal/useAddItemForm';
import { useAddItemSubmit } from './AddItemModal/useAddItemSubmit';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  addItemUseCase: AddItemUseCase;
  userId: string;
}

export function AddItemModal({ isOpen, onClose, addItemUseCase, userId }: AddItemModalProps) {
  const {
    form,
    searchInput,
    setSearchInput,
    isSubmitting,
    setIsSubmitting,
    selectedType,
    setValue,
    resetForm,
  } = useAddItemForm();

  const [debouncedQuery] = useDebounce(searchInput, 300);
  const { handleSubmit, register, formState: { errors } } = form;

  const { data: searchData, isLoading: isSearching, error: searchError } = useItemSearch(
    debouncedQuery,
    selectedType,
    isOpen && debouncedQuery.length >= 2
  );

  const { onSubmit } = useAddItemSubmit({
    addItemUseCase,
    userId,
    onSuccess: onClose,
    setIsSubmitting,
  });

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (searchError) {
      toast.error('Search failed. Please try again.');
    }
  }, [searchError]);

  const handleSearchSelect = (result: SearchResult) => {
    setValue('title', result.title);
    setValue('author', result.author || '');
    if (result.isbn) setValue('isbn', result.isbn);
    if (result.doi) setValue('doi', result.doi);
    if (result.url) setValue('url', result.url);
    setSearchInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const searchResults = searchData?.results || [];
  const searchPlaceholder = 
    selectedType === ItemType.BOOK ? 'title or ISBN' :
    selectedType === ItemType.PAPER ? 'title or DOI' :
    'title or URL';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <FocusLock>
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 id="modal-title" className="text-xl font-black font-mono">ADD NEW ITEM</h2>
              <button
                onClick={onClose}
                className="text-2xl font-black hover:bg-gray-100 w-8 h-8 flex items-center justify-center"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  placeholder={`Search by ${searchPlaceholder}`}
                  aria-label="Search for items"
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
                  aria-busy={isSubmitting}
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
