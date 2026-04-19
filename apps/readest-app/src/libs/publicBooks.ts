import { getBackendAPIBaseUrl } from '@/services/environment';
import { fetchWithAuth } from '@/utils/fetch';

const PUBLIC_BOOK_SHELF_ENDPOINT = `${getBackendAPIBaseUrl()}/publicBook`;
const PUBLIC_BOOKS_ENDPOINT = `${getBackendAPIBaseUrl()}/public/books`;
const PUBLIC_BOOKS_UPLOAD_ENDPOINT = `${getBackendAPIBaseUrl()}/public/books/upload`;
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

export const adminUploadPublicBook = async (
  file: File,
  metadata: { title?: string; author?: string },
): Promise<PublicBook> => {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.author) formData.append('author', metadata.author);
  const response = await fetchWithAuth(PUBLIC_BOOKS_UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to upload public book');
  }
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

export const updatePublicBook = async (
  bookHash: string,
  updates: { title?: string; author?: string; coverFileKey?: string },
): Promise<PublicBook> => {
  const response = await fetchWithAuth(PUBLIC_BOOKS_ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookHash, ...updates }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to update public book');
  }
  const data = await response.json();
  return data.book;
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
