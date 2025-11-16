import { memo } from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ItemType } from '../../../core/entities/Item';
import { AddItemFormData } from './schema';

interface ManualFormProps {
  type: ItemType;
  register: UseFormRegister<AddItemFormData>;
  errors: FieldErrors<AddItemFormData>;
}

export const ManualForm = memo(function ManualForm({ type, register, errors }: ManualFormProps) {
  const inputClass = "w-full p-2 border-2 border-black font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
  const errorClass = "text-red-600 text-xs font-mono mt-1";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-black font-mono mb-1">Title *</label>
        <input
          {...register('title')}
          className={inputClass}
          placeholder="Enter title"
        />
        {errors.title && <div className={errorClass}>{errors.title.message}</div>}
      </div>

      <div>
        <label className="block text-sm font-black font-mono mb-1">Author</label>
        <input
          {...register('author')}
          className={inputClass}
          placeholder="Enter author"
        />
        {errors.author && <div className={errorClass}>{errors.author.message}</div>}
      </div>

      {type === ItemType.BOOK && (
        <div>
          <label className="block text-sm font-black font-mono mb-1">ISBN</label>
          <input
            {...register('isbn')}
            className={inputClass}
            placeholder="978-0123456789"
          />
          {errors.isbn && <div className={errorClass}>{errors.isbn.message}</div>}
        </div>
      )}

      {type === ItemType.PAPER && (
        <div>
          <label className="block text-sm font-black font-mono mb-1">DOI</label>
          <input
            {...register('doi')}
            className={inputClass}
            placeholder="10.1000/182"
          />
          {errors.doi && <div className={errorClass}>{errors.doi.message}</div>}
        </div>
      )}

      {type === ItemType.ARTICLE && (
        <div>
          <label className="block text-sm font-black font-mono mb-1">URL</label>
          <input
            {...register('url')}
            className={inputClass}
            placeholder="https://example.com/article"
          />
          {errors.url && <div className={errorClass}>{errors.url.message}</div>}
        </div>
      )}

      <div>
        <label className="block text-sm font-black font-mono mb-1">Tags</label>
        <input
          {...register('tags')}
          className={inputClass}
          placeholder="programming, career (comma separated)"
        />
      </div>

      <div>
        <label className="block text-sm font-black font-mono mb-1">Rating</label>
        <select {...register('rating', { valueAsNumber: true })} className={inputClass}>
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-black font-mono mb-1">Read Date</label>
        <input
          {...register('readDate')}
          type="date"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-black font-mono mb-1">Notes</label>
        <textarea
          {...register('notes')}
          className={`${inputClass} h-20 resize-none`}
          placeholder="Your thoughts..."
        />
        {errors.notes && <div className={errorClass}>{errors.notes.message}</div>}
      </div>
    </div>
  );
});