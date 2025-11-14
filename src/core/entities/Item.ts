import { UserId } from './User';

export type ItemId = string & { __brand: 'ItemId' };

export enum ItemType {
  BOOK = 'BOOK',
  PAPER = 'PAPER',
  ARTICLE = 'ARTICLE'
}

export enum ReadingStatus {
  WANT_TO_READ = 'WANT_TO_READ',
  READING = 'READING',
  READ = 'READ',
  SKIMMED = 'SKIMMED'
}

export interface ItemConstructorProps {
  id: ItemId;
  userId: UserId;
  type: ItemType;
  title: string;
  author?: string;
  url?: string;
  coverImage?: string;
  publishedYear?: number;
  status?: ReadingStatus;
  rating?: number;
  notes?: string;
  readDate?: Date;
  isPublic?: boolean;
  metadata?: Record<string, any>;
  addedAt?: Date;
  updatedAt?: Date;
}

export class Item {
  private readonly _id: ItemId;
  private readonly _userId: UserId;
  private readonly _type: ItemType;
  private readonly _title: string;
  private readonly _author?: string;
  private readonly _url?: string;
  private readonly _coverImage?: string;
  private readonly _publishedYear?: number;
  private readonly _status: ReadingStatus;
  private readonly _rating?: number;
  private readonly _notes?: string;
  private readonly _readDate?: Date;
  private readonly _isPublic: boolean;
  private readonly _metadata: Record<string, any>;
  private readonly _addedAt: Date;
  private readonly _updatedAt: Date;

  constructor(props: ItemConstructorProps) {
    this.validateTitle(props.title);
    this.validateRating(props.rating);

    this._id = props.id;
    this._userId = props.userId;
    this._type = props.type;
    this._title = props.title;
    this._author = props.author;
    this._url = props.url;
    this._coverImage = props.coverImage;
    this._publishedYear = props.publishedYear;
    this._status = props.status ?? ReadingStatus.READ;
    this._rating = props.rating;
    this._notes = props.notes;
    this._readDate = props.readDate;
    this._isPublic = props.isPublic ?? true;
    this._metadata = props.metadata ?? {};
    this._addedAt = props.addedAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  get id(): ItemId { return this._id; }
  get userId(): UserId { return this._userId; }
  get type(): ItemType { return this._type; }
  get title(): string { return this._title; }
  get author(): string | undefined { return this._author; }
  get url(): string | undefined { return this._url; }
  get coverImage(): string | undefined { return this._coverImage; }
  get publishedYear(): number | undefined { return this._publishedYear; }
  get status(): ReadingStatus { return this._status; }
  get rating(): number | undefined { return this._rating; }
  get notes(): string | undefined { return this._notes; }
  get readDate(): Date | undefined { return this._readDate; }
  get isPublic(): boolean { return this._isPublic; }
  get metadata(): Record<string, any> { return { ...this._metadata }; }
  get addedAt(): Date { return this._addedAt; }
  get updatedAt(): Date { return this._updatedAt; }

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (title.length > 500) {
      throw new Error('Title must be 500 characters or less');
    }
  }

  private validateRating(rating?: number): void {
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }
  }
}

export function createItemId(id: string): ItemId {
  return id as ItemId;
}