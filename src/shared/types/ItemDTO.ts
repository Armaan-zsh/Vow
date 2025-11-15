export interface ItemDTO {
  id: string;
  title: string;
  author?: string;
  type: 'BOOK' | 'PAPER' | 'ARTICLE';
  coverImage?: string;
  publishedYear?: number;
  rating?: number;
  addedAt: string;
}
