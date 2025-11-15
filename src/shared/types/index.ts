export enum ItemType {
  BOOK = 'BOOK',
  PAPER = 'PAPER',
  ARTICLE = 'ARTICLE',
}

export interface AddItemRequest {
  userId: string;
  title: string;
  type: ItemType;
  metadata?: Record<string, any>;
}

export interface Item {
  id: string;
  userId: string;
  title: string;
  type: ItemType;
  metadata: Record<string, any>;
  addedAt: Date;
}
