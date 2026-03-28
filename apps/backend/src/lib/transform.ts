import type { DBBook, DBBookConfig, DBBookNote } from '../types/shared.js';

const sanitizeString = (str?: string | null) => {
  if (!str) return str ?? undefined;
  return str.replace(/\u0000/g, '');
};

export const transformBookConfigToDB = (
  bookConfig: Record<string, unknown>,
  userId: string,
): DBBookConfig => {
  return {
    user_id: userId,
    book_hash: String(bookConfig['bookHash'] ?? ''),
    meta_hash: (bookConfig['metaHash'] as string | undefined) ?? undefined,
    location: (bookConfig['location'] as string | undefined) ?? undefined,
    xpointer: (bookConfig['xpointer'] as string | undefined) ?? undefined,
    progress: bookConfig['progress'] ? JSON.stringify(bookConfig['progress']) : undefined,
    search_config: bookConfig['searchConfig']
      ? JSON.stringify(bookConfig['searchConfig'])
      : undefined,
    view_settings: bookConfig['viewSettings']
      ? JSON.stringify(bookConfig['viewSettings'])
      : undefined,
    updated_at: new Date(
      (bookConfig['updatedAt'] as number | undefined) ?? Date.now(),
    ).toISOString(),
  };
};

export const transformBookToDB = (book: Record<string, unknown>, userId: string): DBBook => {
  return {
    user_id: userId,
    book_hash: String(book['hash'] ?? ''),
    meta_hash: (book['metaHash'] as string | undefined) ?? undefined,
    format: String(book['format'] ?? ''),
    title: sanitizeString(book['title'] as string | undefined) || '',
    author: sanitizeString(book['author'] as string | undefined) || '',
    group_id: (book['groupId'] as string | undefined) ?? undefined,
    group_name: sanitizeString(book['groupName'] as string | undefined) ?? undefined,
    tags: (book['tags'] as string[] | undefined) ?? undefined,
    progress: (book['progress'] as [number, number] | undefined) ?? undefined,
    reading_status: (book['readingStatus'] as string | undefined) ?? undefined,
    source_title: sanitizeString(book['sourceTitle'] as string | undefined) ?? undefined,
    metadata: book['metadata'] ? (sanitizeString(JSON.stringify(book['metadata'])) ?? null) : null,
    created_at: new Date((book['createdAt'] as number | undefined) ?? Date.now()).toISOString(),
    updated_at: new Date((book['updatedAt'] as number | undefined) ?? Date.now()).toISOString(),
    deleted_at: book['deletedAt'] ? new Date(Number(book['deletedAt'])).toISOString() : null,
    uploaded_at: book['uploadedAt'] ? new Date(Number(book['uploadedAt'])).toISOString() : null,
  };
};

export const transformBookNoteToDB = (
  bookNote: Record<string, unknown>,
  userId: string,
): DBBookNote => {
  return {
    user_id: userId,
    book_hash: String(bookNote['bookHash'] ?? ''),
    meta_hash: (bookNote['metaHash'] as string | undefined) ?? undefined,
    id: String(bookNote['id'] ?? ''),
    type: String(bookNote['type'] ?? ''),
    cfi: (bookNote['cfi'] as string | undefined) ?? undefined,
    xpointer0: (bookNote['xpointer0'] as string | undefined) ?? undefined,
    xpointer1: (bookNote['xpointer1'] as string | undefined) ?? undefined,
    page: (bookNote['page'] as number | undefined) ?? undefined,
    text: sanitizeString(bookNote['text'] as string | undefined) ?? undefined,
    style: (bookNote['style'] as string | undefined) ?? undefined,
    color: (bookNote['color'] as string | undefined) ?? undefined,
    note: String(bookNote['note'] ?? ''),
    created_at: new Date((bookNote['createdAt'] as number | undefined) ?? Date.now()).toISOString(),
    updated_at: new Date((bookNote['updatedAt'] as number | undefined) ?? Date.now()).toISOString(),
    deleted_at: bookNote['deletedAt']
      ? new Date(Number(bookNote['deletedAt'])).toISOString()
      : null,
  };
};
