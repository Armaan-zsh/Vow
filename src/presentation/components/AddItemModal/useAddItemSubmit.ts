import { AddItemUseCase } from '@/core/use-cases/AddItemUseCase';
import { AddItemFormData } from './schema';
import { UserId } from '@/core/entities/User';
import toast from 'react-hot-toast';

interface UseAddItemSubmitProps {
  addItemUseCase: AddItemUseCase;
  userId: string;
  onSuccess: () => void;
  setIsSubmitting: (value: boolean) => void;
}

export function useAddItemSubmit({
  addItemUseCase,
  userId,
  onSuccess,
  setIsSubmitting,
}: UseAddItemSubmitProps) {
  const onSubmit = async (data: AddItemFormData) => {
    setIsSubmitting(true);
    try {
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      await addItemUseCase.execute({
        userId: userId as UserId,
        title: data.title,
        type: data.type,
        author: data.author || undefined,
        url: data.url || undefined,
        isbn: data.isbn || undefined,
        doi: data.doi || undefined,
        metadata: { tags, notes: data.notes, rating: data.rating, readDate: data.readDate },
      });

      toast.success('Item added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { onSubmit };
}

