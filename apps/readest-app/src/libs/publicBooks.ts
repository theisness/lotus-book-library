import { getAPIBaseUrl } from '@/services/environment';
import { fetchWithAuth } from '@/utils/fetch';

const PUBLIC_BOOKS_ENDPOINT = `${getAPIBaseUrl()}/public/books`;
const PUBLIC_BOOKS_MINE_ENDPOINT = `${getAPIBaseUrl()}/public/mine`;
const PUBLIC_BOOKS_DOWNLOAD_ENDPOINT = `${getAPIBaseUrl()}/public/download`;

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
}

export interface ListPublicBooksResponse {
  books: PublicBook[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const listPublicBooks = async (
  params?: ListPublicBooksParams,
): Promise<ListPublicBooksResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params?.search?.trim()) queryParams.set('search', params.search.trim());

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

export const publishPublicBook = async (bookHash: string): Promise<void> => {
  await fetchWithAuth(PUBLIC_BOOKS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookHash }),
  });
};

export const unpublishPublicBook = async (bookHash: string): Promise<void> => {
  await fetchWithAuth(`${PUBLIC_BOOKS_ENDPOINT}?bookHash=${encodeURIComponent(bookHash)}`, {
    method: 'DELETE',
  });
};

export const listMyPublishedBooks = async (): Promise<string[]> => {
  const response = await fetchWithAuth(PUBLIC_BOOKS_MINE_ENDPOINT, { method: 'GET' });
  const data = await response.json();
  return data.bookHashes || [];
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
