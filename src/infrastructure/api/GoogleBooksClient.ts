// @ts-nocheck
import { z } from 'zod';
import { ofetch } from 'ofetch';
import { createHash } from 'crypto';
import { ProviderAPIError } from '../../shared/types/errors';

const VolumeInfoSchema = z.object({
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  publishedDate: z.string().optional(),
  description: z.string().optional(),
  pageCount: z.number().optional(),
  categories: z.array(z.string()).optional(),
  imageLinks: z.object({
    thumbnail: z.string().optional(),
    small: z.string().optional(),
    medium: z.string().optional(),
    large: z.string().optional()
  }).optional(),
  industryIdentifiers: z.array(z.object({
    type: z.string(),
    identifier: z.string()
  })).optional(),
  language: z.string().optional(),
  publisher: z.string().optional()
});

const VolumeSchema = z.object({
  id: z.string(),
  volumeInfo: VolumeInfoSchema,
  saleInfo: z.object({
    buyLink: z.string().optional()
  }).optional()
});

const SearchResponseSchema = z.object({
  totalItems: z.number(),
  items: z.array(VolumeSchema).optional()
});

const SingleVolumeResponseSchema = VolumeSchema;

export type Volume = z.infer<typeof VolumeSchema>;
export type VolumeInfo = z.infer<typeof VolumeInfoSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}

interface MetricsClient {
  track(event: string, properties: Record<string, any>): void;
}

export class GoogleBooksClient {
  private readonly baseUrl = 'https://www.googleapis.com/books/v1';
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  constructor(
    private apiKey: string,
    private cache: CacheClient,
    private metrics: MetricsClient
  ) {}

  async search(query: string, maxResults = 10): Promise<SearchResponse> {
    const cacheKey = `gb:search:${this.hashQuery(query, maxResults)}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.metrics.track('google_books_cache_hit', { type: 'search', query });
      return SearchResponseSchema.parse(JSON.parse(cached));
    }

    this.metrics.track('google_books_cache_miss', { type: 'search', query });

    const response = await this.makeRequest('/volumes', {
      q: query,
      maxResults,
      key: this.apiKey
    });

    const parsed = SearchResponseSchema.parse(response);
    
    // Cache for 24 hours
    await this.cache.set(cacheKey, JSON.stringify(parsed), 24 * 60 * 60);
    
    this.metrics.track('google_books_request', { 
      type: 'search', 
      query, 
      totalItems: parsed.totalItems 
    });

    return parsed;
  }

  async getByISBN(isbn: string): Promise<Volume | null> {
    const sanitizedISBN = this.sanitizeISBN(isbn);
    if (!this.isValidISBN(sanitizedISBN)) {
      throw new Error(`Invalid ISBN: ${isbn}`);
    }

    const cacheKey = `gb:isbn:${sanitizedISBN}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.metrics.track('google_books_cache_hit', { type: 'isbn', isbn: sanitizedISBN });
      return JSON.parse(cached);
    }

    this.metrics.track('google_books_cache_miss', { type: 'isbn', isbn: sanitizedISBN });

    const searchResponse = await this.search(`isbn:${sanitizedISBN}`, 1);
    const volume = searchResponse.items?.[0] || null;
    
    // Cache for 30 days
    await this.cache.set(cacheKey, JSON.stringify(volume), 30 * 24 * 60 * 60);
    
    this.metrics.track('google_books_request', { 
      type: 'isbn', 
      isbn: sanitizedISBN,
      found: !!volume 
    });

    return volume;
  }

  async getById(id: string): Promise<Volume> {
    const cacheKey = `gb:id:${id}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.metrics.track('google_books_cache_hit', { type: 'id', id });
      return SingleVolumeResponseSchema.parse(JSON.parse(cached));
    }

    this.metrics.track('google_books_cache_miss', { type: 'id', id });

    const response = await this.makeRequest(`/volumes/${id}`, {
      key: this.apiKey
    });

    const parsed = SingleVolumeResponseSchema.parse(response);
    
    // Cache for 30 days
    await this.cache.set(cacheKey, JSON.stringify(parsed), 30 * 24 * 60 * 60);
    
    this.metrics.track('google_books_request', { type: 'id', id });

    return parsed;
  }

  private async makeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await ofetch(`${this.baseUrl}${endpoint}`, {
          query: params,
          timeout: 10000
        });

        return response;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) {
          this.metrics.track('google_books_error', { 
            status: error.status, 
            attempt: attempt + 1,
            endpoint 
          });
          throw error;
        }

        // Throw ProviderAPIError on 5xx
        if (error.status >= 500) {
          this.metrics.track('google_books_error', { 
            status: error.status, 
            attempt: attempt + 1,
            endpoint 
          });
          
          if (attempt === this.maxRetries - 1) {
            throw new ProviderAPIError(`Google Books API error: ${error.message}`);
          }
        }

        // Exponential backoff with jitter
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          const jitter = Math.random() * 0.1 * delay;
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
      }
    }

    throw new ProviderAPIError(`Google Books API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  private hashQuery(query: string, maxResults: number): string {
    return createHash('md5').update(`${query}:${maxResults}`).digest('hex');
  }

  private sanitizeISBN(isbn: string): string {
    return isbn.replace(/[-\s]/g, '').toUpperCase();
  }

  private isValidISBN(isbn: string): boolean {
    // Basic ISBN validation (10 or 13 digits)
    if (!/^(97[89])?\d{9}[\dX]$/.test(isbn)) {
      return false;
    }

    if (isbn.length === 10) {
      return this.validateISBN10(isbn);
    } else if (isbn.length === 13) {
      return this.validateISBN13(isbn);
    }

    return false;
  }

  private validateISBN10(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i);
    }
    
    const checkDigit = isbn[9] === 'X' ? 10 : parseInt(isbn[9]);
    sum += checkDigit;
    
    return sum % 11 === 0;
  }

  private validateISBN13(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = parseInt(isbn[12]);
    const calculatedCheck = (10 - (sum % 10)) % 10;
    
    return checkDigit === calculatedCheck;
  }
}