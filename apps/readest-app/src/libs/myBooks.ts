import { getAPIBaseUrl } from '@/services/environment';
import { fetchWithAuth } from '@/utils/fetch';
import { transformBookFromDB } from '@/utils/transform';
import { DBBook } from '@/types/records';
import { Book } from '@/types/book';

const MY_BOOKS_ENDPOINT = `${getAPIBaseUrl()}/books`;

interface RemoteBookRecord extends DBBook {
  coverUrl?: string;
}

export const listMyBooks = async (): Promise<Book[]> => {
  const response = await fetchWithAuth(MY_BOOKS_ENDPOINT, { method: 'GET' });
  const data = (await response.json()) as { books?: RemoteBookRecord[] };
  return (data.books || []).map((record) => {
    const book = transformBookFromDB(record);
    book.coverImageUrl = record.coverUrl || book.coverImageUrl;
    return book;
  });
};
