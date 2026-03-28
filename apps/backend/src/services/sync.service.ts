import { PostgrestError } from '@supabase/supabase-js';
import { createSupabaseClient } from '../lib/supabase.js';
import {
  transformBookConfigToDB,
  transformBookNoteToDB,
  transformBookToDB,
} from '../lib/transform.js';
import type {
  BookDataRecord,
  DBBook,
  DBBookConfig,
  SyncData,
  SyncRecord,
  SyncResult,
  SyncType,
} from '../types/shared.js';
import { HttpError } from '../lib/http.js';

const transformsToDB = {
  books: transformBookToDB,
  book_notes: transformBookNoteToDB,
  book_configs: transformBookConfigToDB,
};

const DBSyncTypeMap = {
  books: 'books',
  book_notes: 'notes',
  book_configs: 'configs',
} as const;

type TableName = keyof typeof transformsToDB;
type DBError = { table: TableName; error: PostgrestError };
type DBWritableRecord = DBBook | DBBookConfig | ReturnType<typeof transformBookNoteToDB>;

export const pullChanges = async (params: {
  token: string;
  userId: string;
  since: number;
  type?: SyncType;
  book?: string;
  metaHash?: string;
}): Promise<SyncResult> => {
  if (Number.isNaN(params.since)) {
    throw new HttpError(400, 'Invalid "since" timestamp');
  }

  const supabase: any = createSupabaseClient(params.token);
  const since = new Date(Number(params.since));
  const sinceIso = since.toISOString();
  const results: SyncResult = { books: [], configs: [], notes: [] };
  const errors: Record<TableName, DBError | null> = {
    books: null,
    book_notes: null,
    book_configs: null,
  };

  const queryTables = async (table: TableName, dedupeKeys?: (keyof BookDataRecord)[]) => {
    const PAGE_SIZE = 1000;
    let allRecords: SyncRecord[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from(table)
        .select('*')
        .eq('user_id', params.userId)
        .range(offset, offset + PAGE_SIZE - 1);
      if (params.book && params.metaHash) {
        query = query.or(`book_hash.eq.${params.book},meta_hash.eq.${params.metaHash}`);
      } else if (params.book) {
        query = query.eq('book_hash', params.book);
      } else if (params.metaHash) {
        query = query.eq('meta_hash', params.metaHash);
      }
      query = query.or(`updated_at.gt.${sinceIso},deleted_at.gt.${sinceIso}`);
      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw { table, error } as DBError;

      if (data && data.length > 0) {
        allRecords = allRecords.concat(data);
        offset += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    let records = allRecords;
    if (dedupeKeys?.length) {
      const seen = new Set<string>();
      records = records.filter((rec) => {
        const key = dedupeKeys
          .map((k) => String(rec[k] ?? ''))
          .filter(Boolean)
          .join('|');
        if (key && seen.has(key)) return false;
        if (key) seen.add(key);
        return true;
      });
    }
    results[DBSyncTypeMap[table]] = records || [];
  };

  if (!params.type || params.type === 'books') {
    await queryTables('books').catch((err) => (errors['books'] = err));
    if (results.books?.length === 0 && since.getTime() < 1000) {
      const dummyHash = '00000000000000000000000000000000';
      const now = Date.now();
      results.books.push({
        user_id: params.userId,
        id: dummyHash,
        book_hash: dummyHash,
        deleted_at: now,
        updated_at: now,
        hash: dummyHash,
        title: 'Dummy Book',
        format: 'EPUB',
        author: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      } as SyncRecord);
    }
  }
  if (!params.type || params.type === 'configs') {
    await queryTables('book_configs').catch((err) => (errors['book_configs'] = err));
  }
  if (!params.type || params.type === 'notes') {
    await queryTables('book_notes', ['id']).catch((err) => (errors['book_notes'] = err));
  }

  const dbErrors = Object.values(errors).filter((err) => err !== null) as DBError[];
  if (dbErrors.length > 0) {
    throw new Error(
      dbErrors.map((err) => `${err.table}: ${err.error.message || 'Unknown error'}`).join('; '),
    );
  }

  return results;
};

export const pushChanges = async (params: {
  token: string;
  userId: string;
  payload: SyncData;
}): Promise<SyncResult> => {
  const supabase: any = createSupabaseClient(params.token);
  const { books = [], configs = [], notes = [] } = params.payload;
  const BATCH_SIZE = 100;

  const upsertRecords = async (
    table: TableName,
    primaryKeys: (keyof BookDataRecord)[],
    records: BookDataRecord[],
  ) => {
    if (records.length === 0) return { data: [] };

    const allAuthoritativeRecords: SyncRecord[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const dedupedBatchMap = new Map<string, BookDataRecord>();
      for (const record of batch) {
        const key = primaryKeys.map((pk) => String(record[pk] ?? '')).join('|');
        const existing = dedupedBatchMap.get(key);
        if (!existing) {
          dedupedBatchMap.set(key, record);
          continue;
        }
        const existingUpdatedAt = existing.updated_at ?? 0;
        const recordUpdatedAt = record.updated_at ?? 0;
        const existingDeletedAt = existing.deleted_at ?? 0;
        const recordDeletedAt = record.deleted_at ?? 0;
        if (recordDeletedAt > existingDeletedAt || recordUpdatedAt >= existingUpdatedAt) {
          dedupedBatchMap.set(key, record);
        }
      }
      const dedupedBatch = Array.from(dedupedBatchMap.values());
      const dbRecords = dedupedBatch.map((rec) => {
        const dbRec = transformsToDB[table](
          rec as unknown as Record<string, unknown>,
          params.userId,
        ) as DBWritableRecord;
        rec.user_id = params.userId;
        rec.book_hash = String(dbRec.book_hash ?? rec.book_hash);
        return { original: rec, db: dbRec };
      });

      const matchConditions = dbRecords.map(({ original }) => {
        const conditions: Record<string, string | number> = { user_id: params.userId };
        for (const pk of primaryKeys) {
          conditions[String(pk)] = original[pk]! as string | number;
        }
        return conditions;
      });

      const orConditions = matchConditions
        .map((cond) => {
          const parts = Object.entries(cond).map(([key, val]) => `${key}.eq.${val}`);
          return `and(${parts.join(',')})`;
        })
        .join(',');

      const { data: serverRecords, error: fetchError } = await supabase
        .from(table)
        .select()
        .or(orConditions);
      if (fetchError) {
        return { error: fetchError.message };
      }

      const serverRecordsMap = new Map<string, BookDataRecord>();
      (serverRecords || []).forEach((record: BookDataRecord) => {
        const key = primaryKeys.map((pk) => String(record[pk] ?? '')).join('|');
        serverRecordsMap.set(key, record);
      });

      const toInsert: DBWritableRecord[] = [];
      const toUpdate: DBWritableRecord[] = [];
      const batchAuthoritativeRecords: SyncRecord[] = [];

      for (const { original, db: dbRec } of dbRecords) {
        const key = primaryKeys.map((pk) => String(original[pk] ?? '')).join('|');
        const serverData = serverRecordsMap.get(key);
        if (!serverData) {
          dbRec.updated_at = new Date().toISOString();
          toInsert.push(dbRec);
        } else {
          const clientUpdatedAt = dbRec.updated_at
            ? new Date(String(dbRec.updated_at)).getTime()
            : 0;
          const serverUpdatedAt = serverData.updated_at
            ? new Date(serverData.updated_at).getTime()
            : 0;
          const clientDeletedAt = dbRec.deleted_at
            ? new Date(String(dbRec.deleted_at)).getTime()
            : 0;
          const serverDeletedAt = serverData.deleted_at
            ? new Date(serverData.deleted_at).getTime()
            : 0;
          const clientIsNewer =
            clientDeletedAt > serverDeletedAt || clientUpdatedAt > serverUpdatedAt;
          if (clientIsNewer) {
            toUpdate.push(dbRec);
          } else {
            batchAuthoritativeRecords.push(serverData as unknown as SyncRecord);
          }
        }
      }

      if (toInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from(table)
          .insert(toInsert)
          .select();
        if (insertError) {
          return { error: insertError.message };
        }
        batchAuthoritativeRecords.push(...((inserted || []) as SyncRecord[]));
      }

      if (toUpdate.length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from(table)
          .upsert(toUpdate, { onConflict: ['user_id', ...primaryKeys].join(',') })
          .select();
        if (updateError) {
          return { error: updateError.message };
        }
        batchAuthoritativeRecords.push(...((updated || []) as SyncRecord[]));
      }

      allAuthoritativeRecords.push(...batchAuthoritativeRecords);
    }

    return { data: allAuthoritativeRecords };
  };

  const [booksResult, configsResult, notesResult] = await Promise.all([
    upsertRecords('books', ['book_hash'], books as unknown as BookDataRecord[]),
    upsertRecords('book_configs', ['book_hash'], configs as unknown as BookDataRecord[]),
    upsertRecords('book_notes', ['book_hash', 'id'], notes as unknown as BookDataRecord[]),
  ]);

  if (booksResult?.error) throw new Error(booksResult.error);
  if (configsResult?.error) throw new Error(configsResult.error);
  if (notesResult?.error) throw new Error(notesResult.error);

  return {
    books: booksResult?.data || [],
    configs: configsResult?.data || [],
    notes: notesResult?.data || [],
  };
};
