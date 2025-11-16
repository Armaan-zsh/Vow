import type { Meta, StoryObj } from '@storybook/react';
import { ItemCard } from './ItemCard';
import { ItemDTO } from '../../shared/types/ItemDTO';

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
    onEdit: { action: 'edit clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockBook: ItemDTO = {
  id: '1',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  type: 'BOOK',
  coverImage: 'https://images-na.ssl-images-amazon.com/images/I/51W1sBPO7tL._SX380_BO1,204,203,200_.jpg',
  rating: 5,
  readDate: '2024-01-15',
  status: 'read',
  tags: ['programming', 'career'],
  addedAt: '2024-01-01',
};

const mockPaper: ItemDTO = {
  id: '2', 
  title: 'Attention Is All You Need',
  author: 'Vaswani et al.',
  type: 'PAPER',
  rating: 4,
  status: 'reading',
  tags: ['ai', 'transformers', 'nlp'],
  addedAt: '2024-02-01',
};

const mockArticle: ItemDTO = {
  id: '3',
  title: 'Building Resilient Frontend Architecture',
  type: 'ARTICLE',
  status: 'want-to-read',
  tags: ['frontend', 'architecture'],
  addedAt: '2024-03-01',
};

export const GridBook: Story = {
  args: {
    item: mockBook,
    variant: 'grid',
  },
};

export const GridPaper: Story = {
  args: {
    item: mockPaper,
    variant: 'grid',
  },
};

export const GridArticle: Story = {
  args: {
    item: mockArticle,
    variant: 'grid',
  },
};

export const ListBook: Story = {
  args: {
    item: mockBook,
    variant: 'list',
  },
};

export const ListPaper: Story = {
  args: {
    item: mockPaper,
    variant: 'list',
  },
};

export const ListArticle: Story = {
  args: {
    item: mockArticle,
    variant: 'list',
  },
};

export const WithoutEdit: Story = {
  args: {
    item: mockBook,
    variant: 'grid',
    onEdit: undefined,
  },
};

export const GridCollection: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-4">
      <ItemCard item={mockBook} variant="grid" onEdit={() => {}} />
      <ItemCard item={mockPaper} variant="grid" onEdit={() => {}} />
      <ItemCard item={mockArticle} variant="grid" onEdit={() => {}} />
    </div>
  ),
};

export const ListCollection: Story = {
  render: () => (
    <div className="space-y-4 p-4 max-w-2xl">
      <ItemCard item={mockBook} variant="list" onEdit={() => {}} />
      <ItemCard item={mockPaper} variant="list" onEdit={() => {}} />
      <ItemCard item={mockArticle} variant="list" onEdit={() => {}} />
    </div>
  ),
};