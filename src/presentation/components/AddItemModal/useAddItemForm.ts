import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ItemType } from '@/core/entities/Item';
import { addItemSchema, AddItemFormData } from './schema';

export function useAddItemForm() {
  const [searchInput, setSearchInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { type: ItemType.BOOK },
  });

  const { watch, setValue, reset } = form;
  const selectedType = watch('type');

  const resetForm = () => {
    reset();
    setSearchInput('');
  };

  return {
    form,
    searchInput,
    setSearchInput,
    isSubmitting,
    setIsSubmitting,
    selectedType,
    setValue,
    resetForm,
  };
}

