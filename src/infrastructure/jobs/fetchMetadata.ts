import { inngest } from '../inngest/client';
import { ofetch } from 'ofetch';
import { CircuitBreaker } from 'opossum';
import { ItemId } from '../../core/entities/Item';
import { IItemRepository } from '../../core/repositories/IItemRepository';
import { IEventEmitter } from '../../core/repositories/IEventEmitter';

interface MetadataRequestEvent {
  data: {
    itemId: ItemId;
    type: 'isbn' | 'doi' | 'url';
    value: string;
  };
}

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo: {
      title?: string;
      authors?: string[];
      publishedDate?: string;
      description?: string;
      imageLinks?: {
        thumbnail?: string;
      };
      industryIdentifiers?: Array<{
        type: string;
        identifier: string;
      }>;
    };
  }>;
}

interface CrossRefResponse {
  message: {
    title?: string[];
    author?: Array<{
      given?: string;
      family?: string;
    }>;
    published?: {
      'date-parts'?: number[][];
    };
    abstract?: string;
    URL?: string;
  };
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

// Circuit breakers for external APIs
const googleBooksBreaker = new CircuitBreaker(async (isbn: string) => {
  return await ofetch<GoogleBooksResponse>(`https://www.googleapis.com/books/v1/volumes`, {
    query: { q: `isbn:${isbn}` },
    timeout: 10000
  });
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

const crossRefBreaker = new CircuitBreaker(async (doi: string) => {
  return await ofetch<CrossRefResponse>(`https://api.crossref.org/works/${doi}`, {
    timeout: 10000
  });
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

const urlScraperBreaker = new CircuitBreaker(async (url: string) => {
  // Simple Open Graph scraper
  const html = await ofetch<string>(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'ReadFlex-Bot/1.0'
    }
  });

  const ogData: OpenGraphData = {};
  
  // Extract Open Graph tags
  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"[^>]*>/i);
  if (titleMatch) ogData.title = titleMatch[1];

  const descMatch = html.match(/<meta property="og:description" content="([^"]*)"[^>]*>/i);
  if (descMatch) ogData.description = descMatch[1];

  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"[^>]*>/i);
  if (imageMatch) ogData.image = imageMatch[1];

  const urlMatch = html.match(/<meta property="og:url" content="([^"]*)"[^>]*>/i);
  if (urlMatch) ogData.url = urlMatch[1];

  return ogData;
}, {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

export const fetchMetadata = inngest.createFunction(
  {
    id: 'fetch-metadata',
    retries: 3,
    concurrency: {
      limit: 10
    }
  },
  { event: 'item.metadata.requested' },
  async ({ event, step, logger }) => {
    const { itemId, type, value } = event.data as MetadataRequestEvent['data'];

    logger.info('Starting metadata fetch', { itemId, type, value });

    const metadata = await step.run('fetch-metadata', async () => {
      try {
        switch (type) {
          case 'isbn':
            return await fetchBookMetadata(value);
          case 'doi':
            return await fetchPaperMetadata(value);
          case 'url':
            return await fetchUrlMetadata(value);
          default:
            throw new Error(`Unsupported metadata type: ${type}`);
        }
      } catch (error) {
        logger.error('Metadata fetch failed', { itemId, type, value, error });
        return { error: error.message, status: 'metadata_failed' };
      }
    });

    await step.run('update-item', async () => {
      // This would use dependency injection in real implementation
      const itemRepository = getItemRepository();
      
      if (metadata.error) {
        await itemRepository.update(itemId, {
          metadata: { 
            ...metadata,
            fetchedAt: new Date().toISOString(),
            status: 'failed'
          }
        });
      } else {
        await itemRepository.update(itemId, {
          title: metadata.title || undefined,
          author: metadata.author || undefined,
          coverImage: metadata.coverImage || undefined,
          publishedYear: metadata.publishedYear || undefined,
          metadata: {
            ...metadata,
            fetchedAt: new Date().toISOString(),
            status: 'success'
          }
        });
      }
    });

    await step.run('emit-completion-event', async () => {
      const eventEmitter = getEventEmitter();
      await eventEmitter.emit('item.metadata.fetched', {
        itemId,
        success: !metadata.error,
        metadata
      });
    });

    return { success: !metadata.error, metadata };
  }
);

async function fetchBookMetadata(isbn: string) {
  const response = await googleBooksBreaker.fire(isbn);
  
  if (!response.items || response.items.length === 0) {
    return { error: 'No book found for ISBN' };
  }

  const book = response.items[0].volumeInfo;
  
  return {
    title: book.title,
    author: book.authors?.[0],
    publishedYear: book.publishedDate ? new Date(book.publishedDate).getFullYear() : undefined,
    description: book.description,
    coverImage: book.imageLinks?.thumbnail,
    isbn,
    source: 'google-books',
    rawResponse: response
  };
}

async function fetchPaperMetadata(doi: string) {
  const response = await crossRefBreaker.fire(doi);
  const paper = response.message;
  
  const author = paper.author?.[0] 
    ? `${paper.author[0].given} ${paper.author[0].family}`.trim()
    : undefined;
    
  const publishedYear = paper.published?.['date-parts']?.[0]?.[0];
  
  return {
    title: paper.title?.[0],
    author,
    publishedYear,
    description: paper.abstract,
    url: paper.URL,
    doi,
    source: 'crossref',
    rawResponse: response
  };
}

async function fetchUrlMetadata(url: string) {
  const ogData = await urlScraperBreaker.fire(url);
  
  return {
    title: ogData.title,
    description: ogData.description,
    coverImage: ogData.image,
    url: ogData.url || url,
    source: 'opengraph',
    rawResponse: ogData
  };
}

// Dependency injection placeholders - would be injected in real implementation
function getItemRepository(): IItemRepository {
  throw new Error('ItemRepository not injected');
}

function getEventEmitter(): IEventEmitter {
  throw new Error('EventEmitter not injected');
}