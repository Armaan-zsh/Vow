import { NextRequest, NextResponse } from 'next/server';
import { ItemType } from '@/core/entities/Item';
import { GoogleBooksClient } from '@/infrastructure/api/GoogleBooksClient';

// Mock cache and metrics for now
const mockCache = {
  get: async () => null,
  set: async () => {},
};

const mockMetrics = {
  track: () => {},
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type') as ItemType;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (type === ItemType.BOOK) {
      const client = new GoogleBooksClient(
        process.env.GOOGLE_BOOKS_API_KEY || '',
        mockCache as any,
        mockMetrics as any
      );
      const response = await client.search(query, 10);
      
      const results = (response.items || []).map((item) => ({
        id: item.id,
        title: item.volumeInfo.title || '',
        author: item.volumeInfo.authors?.[0],
        isbn: item.volumeInfo.industryIdentifiers?.find((id) => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier,
        coverImage: item.volumeInfo.imageLinks?.thumbnail,
        publishedYear: item.volumeInfo.publishedDate ? new Date(item.volumeInfo.publishedDate).getFullYear() : undefined,
      }));

      return NextResponse.json({ results });
    }

    if (type === ItemType.PAPER) {
      // CrossRef or arXiv search
      const doiMatch = query.match(/10\.\d{4,}\/[^\s]+/);
      if (doiMatch) {
        const doi = doiMatch[0];
        const response = await fetch(`https://api.crossref.org/works/${doi}`, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          const paper = data.message;
          return NextResponse.json({
            results: [{
              id: doi,
              title: paper.title?.[0] || '',
              author: paper.author?.[0] ? `${paper.author[0].given} ${paper.author[0].family}`.trim() : undefined,
              doi,
              publishedYear: paper.published?.['date-parts']?.[0]?.[0],
            }],
          });
        }
      }

      // Fallback: arXiv search
      const arxivResponse = await fetch(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=10`);
      if (arxivResponse.ok) {
        const xml = await arxivResponse.text();
        // Simple XML parsing (in production, use proper parser)
        const titles = xml.match(/<title>(.*?)<\/title>/g)?.slice(1) || [];
        const authors = xml.match(/<name>(.*?)<\/name>/g) || [];
        
        return NextResponse.json({
          results: titles.slice(0, 10).map((title, i) => ({
            id: `arxiv-${i}`,
            title: title.replace(/<\/?title>/g, ''),
            author: authors[i]?.replace(/<\/?name>/g, ''),
          })),
        });
      }
    }

    if (type === ItemType.ARTICLE) {
      // URL metadata fetch
      const urlMatch = query.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        // In production, this would fetch Open Graph data
        return NextResponse.json({
          results: [{
            id: url,
            title: query,
            url,
          }],
        });
      }
    }

    return NextResponse.json({ results: [] });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}

