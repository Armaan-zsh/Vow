export interface BookMetadata {
  isbn: string;
  title?: string;
  author?: string;
  publishedYear?: number;
  coverImage?: string;
}

export interface IMetadataService {
  fetchBookByISBN(isbn: string): Promise<BookMetadata | null>;
}