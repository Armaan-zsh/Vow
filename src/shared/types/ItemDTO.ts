export interface ItemDTO {
  id: string;
  title: string;
  author?: string;
  type: 'BOOK' | 'PAPER' | 'ARTICLE';
  coverImage?: string;
  publishedYear?: number;
  rating?: number;
  readDate?: string;
  status: 'want-to-read' | 'reading' | 'read' | 'skimmed';
  tags?: string[];
  addedAt: string;
}
