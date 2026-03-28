import { getBackendAPIBaseUrl } from '@/services/environment';
import { fetchWithAuth } from '@/utils/fetch';

const PUBLIC_BOOK_SHELF_ENDPOINT = `${getBackendAPIBaseUrl()}/publicBook`;
const PUBLIC_BOOKS_ENDPOINT = `${getBackendAPIBaseUrl()}/public/books`;
const PUBLIC_BOOKS_MINE_ENDPOINT = `${getBackendAPIBaseUrl()}/public/mine`;
const PUBLIC_BOOKS_DOWNLOAD_ENDPOINT = `${getBackendAPIBaseUrl()}/public/download`;

export interface PublicBook {
  id: string;
  owner_user_id: string;
  book_hash: string;
  title: string | null;
  author: string | null;
  format: string | null;
  cover_file_key: string | null;
  book_file_key: string;
  published_at: string;
  coverUrl?: string;
}

export interface ListPublicBooksParams {
  page?: number;
  pageSize?: number;
  search?: string;
  format?: string;
  ownerUserId?: string;
}

export interface ListPublicBooksResponse {
  books: PublicBook[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const listPublicBookShelf = async (): Promise<PublicBook[]> => {
  const response = await fetch(PUBLIC_BOOK_SHELF_ENDPOINT, { method: 'GET' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Request failed');
  }
  const data = await response.json();
  return data.books || [];
};

export const listPublicBooks = async (
  params?: ListPublicBooksParams,
): Promise<ListPublicBooksResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params?.search?.trim()) queryParams.set('search', params.search.trim());
  if (params?.format) queryParams.set('format', params.format);
  if (params?.ownerUserId) queryParams.set('ownerUserId', params.ownerUserId);

  const url = queryParams.toString()
    ? `${PUBLIC_BOOKS_ENDPOINT}?${queryParams.toString()}`
    : PUBLIC_BOOKS_ENDPOINT;

  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Request failed');
  }
  return await response.json();
};

export const publishPublicBook = async (bookHash: string): Promise<PublicBook> => {
  const response = await fetchWithAuth(PUBLIC_BOOKS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookHash }),
  });
  const data = await response.json();
  return data.book;
};

export const unpublishPublicBook = async (bookHash: string): Promise<void> => {
  const response = await fetchWithAuth(
    `${PUBLIC_BOOKS_ENDPOINT}?bookHash=${encodeURIComponent(bookHash)}`,
    {
      method: 'DELETE',
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to unpublish public book');
  }
};

export const listMyPublishedBooks = async (): Promise<string[]> => {
  const response = await fetchWithAuth(PUBLIC_BOOKS_MINE_ENDPOINT, { method: 'GET' });
  const data = await response.json();
  return data.bookHashes || [];
};

export const listMyPublishedBooksDetail = async (): Promise<PublicBook[]> => {
  const response = await fetchWithAuth(`${PUBLIC_BOOKS_MINE_ENDPOINT}?detail=1`, { method: 'GET' });
  const data = await response.json();
  return data.books || [];
};

export const getPublicBookDownloadUrl = async (id: string): Promise<string> => {
  const response = await fetch(`${PUBLIC_BOOKS_DOWNLOAD_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Request failed');
  }
  const data = await response.json();
  return data.downloadUrl;
};
