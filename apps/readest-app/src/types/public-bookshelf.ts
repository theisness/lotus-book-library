// 书架模式
export type BookshelfMode = 'public' | 'personal';

// 活动记录
export interface ActivityRecord {
  id: string;
  action: 'book_published' | 'book_updated' | 'book_unpublished' | 'note_added';
  actor_user_id: string;
  target_book_hash: string;
  target_book_title: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// 公共书籍批注
export interface PublicBookNote {
  id: string;
  bookHash: string;
  adminUserId: string;
  type: string; // 'bookmark' | 'annotation' | 'excerpt'
  cfi: string;
  text?: string;
  style?: string;
  color?: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

// 公共书籍配置
export interface PublicBookConfig {
  bookHash: string;
  adminUserId: string;
  location?: string;
  progress?: string;
  viewSettings?: Record<string, unknown>;
}

// 活动日志响应
export interface ActivityFeedResponse {
  activities: ActivityRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
