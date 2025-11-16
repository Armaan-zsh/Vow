import type { Meta, StoryObj } from '@storybook/react';
import { ItemCard } from '../src/presentation/components/ItemCard';
import { ItemDTO } from '../src/shared/types/ItemDTO';

const meta: Meta<typeof ItemCard> = {
  title: 'Components/ItemCard',
  component: ItemCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['grid', 'list'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockBook: ItemDTO = {
  id: '1',
  title: 'The Design of Everyday Things',
  author: 'Don Norman',
  type: 'BOOK',
  coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop',
  publishedYear: 1988,
  rating: 5,
  status: 'read',
  readDate: '2024-01-15',
  tags: ['design', 'ux'],
  addedAt: '2024-01-15T10:00:00Z'
};

const mockPaper: ItemDTO = {
  id: '2',
  title: 'Attention Is All You Need',
  author: 'Vaswani et al.',
  type: 'PAPER',
  publishedYear: 2017,
  rating: 4,
  status: 'reading',
  tags: ['ai', 'transformers'],
  addedAt: '2024-01-10T14:30:00Z'
};

const mockArticle: ItemDTO = {
  id: '3',
  title: 'The Future of Web Development',
  author: 'Jane Developer',
  type: 'ARTICLE',
  coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200&h=300&fit=crop',
  publishedYear: 2024,
  status: 'want-to-read',
  tags: ['web', 'frontend'],
  addedAt: '2024-01-20T09:15:00Z'
};

export const BookGrid: Story = {
  args: {
    item: mockBook,
    variant: 'grid',
    onEdit: () => console.log('Edit clicked'),
  },
};

export const BookList: Story = {
  args: {
    item: mockBook,
    variant: 'list',
    onEdit: () => console.log('Edit clicked'),
  },
};

export const PaperGrid: Story = {
  args: {
    item: mockPaper,
    variant: 'grid',
    onEdit: () => console.log('Edit clicked'),
  },
};

export const ArticleGrid: Story = {
  args: {
    item: mockArticle,
    variant: 'grid',
    onEdit: () => console.log('Edit clicked'),
  },
};

export const GridLayout: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      <ItemCard item={mockBook} variant="grid" onEdit={() => {}} />
      <ItemCard item={mockPaper} variant="grid" onEdit={() => {}} />
      <ItemCard item={mockArticle} variant="grid" onEdit={() => {}} />
      <ItemCard item={{...mockBook, id: '4', title: 'Another Book', status: 'read'}} variant="grid" onEdit={() => {}} />
    </div>
  ),
};

export const ListLayout: Story = {
  render: () => (
    <div className="space-y-4 p-6 max-w-2xl">
      <ItemCard item={mockBook} variant="list" onEdit={() => {}} />
      <ItemCard item={mockPaper} variant="list" onEdit={() => {}} />
      <ItemCard item={mockArticle} variant="list" onEdit={() => {}} />
    </div>
  ),
};

export const WithoutEdit: Story = {
  args: {
    item: mockBook,
    variant: 'grid',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-xl font-black font-mono mb-4">Grid Variant</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <ItemCard item={mockBook} variant="grid" onEdit={() => {}} />
          <ItemCard item={mockPaper} variant="grid" onEdit={() => {}} />
          <ItemCard item={mockArticle} variant="grid" onEdit={() => {}} />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-black font-mono mb-4">List Variant</h2>
        <div className="space-y-4 max-w-2xl">
          <ItemCard item={mockBook} variant="list" onEdit={() => {}} />
          <ItemCard item={mockPaper} variant="list" onEdit={() => {}} />
          <ItemCard item={mockArticle} variant="list" onEdit={() => {}} />
        </div>
      </div>
    </div>
  ),
};