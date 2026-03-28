export interface DBBook {
  user_id: string;
  book_hash: string;
  meta_hash?: string;
  format: string;
  title: string;
  source_title?: string;
  author: string;
  group_id?: string;
  group_name?: string;
  tags?: string[];
  progress?: [number, number];
  reading_status?: string;
  metadata?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  uploaded_at?: string | null;
}

export interface DBBookConfig {
  user_id: string;
  book_hash: string;
  meta_hash?: string;
  location?: string;
  xpointer?: string;
  progress?: string;
  search_config?: string;
  view_settings?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DBBookNote {
  user_id: string;
  book_hash: string;
  meta_hash?: string;
  id: string;
  type: string;
  cfi?: string;
  xpointer0?: string;
  xpointer1?: string;
  page?: number;
  text?: string;
  style?: string;
  color?: string;
  note: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface BookDataRecord {
  id: string;
  book_hash: string;
  meta_hash?: string;
  user_id: string;
  updated_at: number | null;
  deleted_at: number | null;
}

export type SyncType = 'books' | 'configs' | 'notes';

export interface SyncResult {
  books: SyncRecord[] | null;
  notes: SyncRecord[] | null;
  configs: SyncRecord[] | null;
}

export type SyncRecord = Record<string, unknown>;

export interface SyncData {
  books?: Partial<SyncRecord>[];
  notes?: Partial<SyncRecord>[];
  configs?: Partial<SyncRecord>[];
}

export interface PublicBookRecord {
  id: string;
  owner_user_id: string;
  book_hash: string;
  title: string | null;
  author: string | null;
  format: string | null;
  cover_file_key: string | null;
  book_file_key: string;
  published_at: string;
}

export interface RemoteBookRecord extends DBBook {
  coverUrl?: string;
}

export interface FileRecord {
  file_key: string;
  file_size: number;
  book_hash: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface KoSyncProxyPayload {
  serverUrl: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  body?: unknown;
}

export type UserPlan = 'free' | 'plus' | 'pro' | 'purchase';
