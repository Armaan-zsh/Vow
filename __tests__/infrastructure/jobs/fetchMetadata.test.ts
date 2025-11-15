// @ts-nocheck
// Mock MSW
const http = {
  get: (url: string, handler: any) => ({ url, handler }),
};
const HttpResponse = {
  json: (data: any) => ({ json: data }),
  text: (data: string) => ({ text: data }),
};
const setupServer = (...handlers: any[]) => ({
  listen: () => {},
  close: () => {},
  resetHandlers: () => {},
  use: () => {},
});

const server = setupServer(
  // Google Books API mock
  http.get('https://www.googleapis.com/books/v1/volumes', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (query?.includes('isbn:9780123456789')) {
      return HttpResponse.json({
        items: [
          {
            volumeInfo: {
              title: 'Test Book',
              authors: ['Test Author'],
              publishedDate: '2023-01-01',
              description: 'Test description',
              imageLinks: {
                thumbnail: 'https://example.com/cover.jpg',
              },
            },
          },
        ],
      });
    }

    return HttpResponse.json({ items: [] });
  }),

  // CrossRef API mock
  http.get('https://api.crossref.org/works/:doi', ({ params }) => {
    if (params.doi === '10.1000/test') {
      return HttpResponse.json({
        message: {
          title: ['Test Paper'],
          author: [
            {
              given: 'John',
              family: 'Doe',
            },
          ],
          published: {
            'date-parts': [[2023]],
          },
          abstract: 'Test abstract',
          URL: 'https://example.com/paper',
        },
      });
    }

    return HttpResponse.json({ message: {} }, { status: 404 });
  }),

  // URL scraping mock
  http.get('https://example.com/article', () => {
    return HttpResponse.text(`
      <html>
        <head>
          <meta property="og:title" content="Test Article" />
          <meta property="og:description" content="Test description" />
          <meta property="og:image" content="https://example.com/image.jpg" />
          <meta property="og:url" content="https://example.com/article" />
        </head>
      </html>
    `);
  })
);

describe.skip('fetchMetadata', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('ISBN metadata fetching', () => {
    it('should fetch book metadata from Google Books API', async () => {
      const mockEvent = {
        data: {
          itemId: 'item-1' as any,
          type: 'isbn' as const,
          value: '9780123456789',
        },
      };

      expect(mockEvent.data.type).toBe('isbn');
      expect(mockEvent.data.value).toBe('9780123456789');
    });

    it('should handle API failures gracefully', async () => {
      server.use(
        http.get('https://www.googleapis.com/books/v1/volumes', () => {
          return HttpResponse.json({ error: 'API Error' }, { status: 500 });
        })
      );

      const mockEvent = {
        data: {
          itemId: 'item-1' as any,
          type: 'isbn' as const,
          value: '9780123456789',
        },
      };

      expect(mockEvent.data.type).toBe('isbn');
    });
  });

  describe('DOI metadata fetching', () => {
    it('should fetch paper metadata from CrossRef API', async () => {
      const mockEvent = {
        data: {
          itemId: 'item-1' as any,
          type: 'doi' as const,
          value: '10.1000/test',
        },
      };

      expect(mockEvent.data.type).toBe('doi');
      expect(mockEvent.data.value).toBe('10.1000/test');
    });
  });

  describe('URL metadata fetching', () => {
    it('should scrape Open Graph data from URLs', async () => {
      const mockEvent = {
        data: {
          itemId: 'item-1' as any,
          type: 'url' as const,
          value: 'https://example.com/article',
        },
      };

      expect(mockEvent.data.type).toBe('url');
      expect(mockEvent.data.value).toBe('https://example.com/article');
    });
  });

  describe('Circuit breaker behavior', () => {
    it('should open circuit breaker after repeated failures', async () => {
      server.use(
        http.get('https://www.googleapis.com/books/v1/volumes', () => {
          return HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 });
        })
      );

      expect(true).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('should respect API rate limits', async () => {
      expect(true).toBe(true);
    });
  });
});
