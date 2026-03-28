import { createSupabaseAdminClient } from '../lib/supabase.js';
import { deleteObject, getDownloadSignedUrl, getUploadSignedUrl } from '../lib/object-storage.js';
import { HttpError } from '../lib/http.js';
import { STORAGE_QUOTA_GRACE_BYTES, getStoragePlanData } from './auth.service.js';
import { env } from '../config/env.js';

export const createUploadSession = async (params: {
  userId: string;
  token: string;
  fileName?: string;
  fileSize?: number;
  bookHash?: string;
  temp?: boolean;
}) => {
  const { userId, token, fileName, fileSize, bookHash, temp = false } = params;

  if (temp) {
    if (!fileName || !fileSize) {
      throw new HttpError(400, 'Missing file info');
    }
    const datetime = new Date();
    const timeStr = datetime.toISOString().replace(/[-:]/g, '').replace('T', '').slice(0, 10);
    const userStr = userId.slice(0, 8);
    const fileKey = `temp/img/${timeStr}/${userStr}/${fileName}`;
    const bucketName = env.tempStoragePublicBucketName;
    const uploadUrl = await getUploadSignedUrl(fileKey, fileSize, 1800, bucketName);
    const downloadUrl = await getDownloadSignedUrl(fileKey, 3 * 86400, bucketName);
    const pathname = new URL(downloadUrl).pathname;
    const publicDownloadUrl = `${env.publicStorageBaseUrl}${pathname.replace(`/${bucketName}`, '')}`;
    return { uploadUrl, downloadUrl: publicDownloadUrl };
  }

  if (!fileName || !fileSize) {
    throw new HttpError(400, 'Missing file info');
  }

  const { usage, quota } = getStoragePlanData(token);
  if (usage + fileSize > quota + STORAGE_QUOTA_GRACE_BYTES) {
    throw new HttpError(403, 'Insufficient storage quota');
  }

  const fileKey = `${userId}/${fileName}`;
  const supabase = createSupabaseAdminClient();
  const { data: existingRecord, error: fetchError } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .eq('file_key', fileKey)
    .limit(1)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(fetchError.message);
  }

  let objSize = fileSize;
  if (existingRecord) {
    objSize = existingRecord.file_size;
  } else {
    const { error: insertError } = await supabase.from('files').insert([
      {
        user_id: userId,
        book_hash: bookHash,
        file_key: fileKey,
        file_size: fileSize,
      },
    ]);
    if (insertError) throw new Error(insertError.message);
  }

  const uploadUrl = await getUploadSignedUrl(fileKey, objSize, 1800);
  return {
    uploadUrl,
    fileKey,
    usage: usage + fileSize,
    quota,
  };
};

export const getDownloadUrls = async (userId: string, fileKeys: string[]) => {
  if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
    throw new HttpError(400, 'Missing or invalid fileKeys array');
  }

  const supabase = createSupabaseAdminClient();
  const { data: fileRecords, error: fileError } = await supabase
    .from('files')
    .select('user_id, file_key, book_hash')
    .eq('user_id', userId)
    .in('file_key', fileKeys)
    .is('deleted_at', null);

  if (fileError) {
    throw new Error(fileError.message);
  }

  const fileRecordMap = new Map((fileRecords || []).map((record) => [record.file_key, record]));
  const missingFileKeys = fileKeys.filter((key) => !fileRecordMap.has(key));

  if (missingFileKeys.length > 0) {
    const fallbackCandidates = missingFileKeys
      .filter((key) => key.includes('Readest/Book'))
      .map((key) => {
        const parts = key.split('/');
        if (parts.length === 5) {
          const bookHash = parts[3]!;
          const filename = parts[4]!;
          const fileExtension = filename.split('.').pop() || '';
          return { originalKey: key, bookHash, fileExtension };
        }
        return null;
      })
      .filter(Boolean) as Array<{ originalKey: string; bookHash: string; fileExtension: string }>;

    if (fallbackCandidates.length > 0) {
      const bookHashes = [...new Set(fallbackCandidates.map((c) => c.bookHash))];
      const { data: fallbackRecords, error: fallbackError } = await supabase
        .from('files')
        .select('user_id, file_key, book_hash')
        .eq('user_id', userId)
        .in('book_hash', bookHashes)
        .is('deleted_at', null);

      if (!fallbackError && fallbackRecords) {
        for (const candidate of fallbackCandidates) {
          const matchedFile = fallbackRecords.find(
            (f) =>
              f.book_hash === candidate.bookHash &&
              f.file_key.endsWith(`.${candidate.fileExtension}`),
          );
          if (matchedFile) {
            fileRecordMap.set(candidate.originalKey, matchedFile);
          }
        }
      }
    }
  }

  const results = await Promise.allSettled(
    fileKeys.map(async (fileKey) => {
      const fileRecord = fileRecordMap.get(fileKey);
      if (!fileRecord || fileRecord.user_id !== userId) {
        return { fileKey, downloadUrl: undefined };
      }
      try {
        const downloadUrl = await getDownloadSignedUrl(fileRecord.file_key, 1800);
        return { fileKey, downloadUrl };
      } catch {
        return { fileKey, downloadUrl: undefined };
      }
    }),
  );

  const downloadUrls: Record<string, string | undefined> = {};
  results.forEach((result, index) => {
    const fileKey = fileKeys[index]!;
    downloadUrls[fileKey] = result.status === 'fulfilled' ? result.value.downloadUrl : undefined;
  });

  return downloadUrls;
};

export const listFiles = async (
  userId: string,
  params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
    bookHash?: string;
    search?: string;
  },
) => {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 50, 100);
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from('files')
    .select('file_key, file_size, book_hash, created_at, updated_at', { count: 'exact' })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (params.bookHash) query = query.eq('book_hash', params.bookHash);
  if (params.search) query = query.ilike('file_key', `%${params.search}%`);

  const validSortColumns = ['created_at', 'updated_at', 'file_size', 'file_key'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: files, error: filesError, count } = await query;
  if (filesError) throw new Error(filesError.message);

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);
  const bookHashes = Array.from(new Set((files || []).map((f) => f.book_hash).filter(Boolean)));

  let allRelatedFiles = files || [];
  if (bookHashes.length > 0) {
    const { data: relatedFiles } = await supabase
      .from('files')
      .select('file_key, file_size, book_hash, created_at, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('book_hash', bookHashes as string[]);

    if (relatedFiles) {
      const fileMap = new Map(allRelatedFiles.map((f) => [f.file_key, f]));
      relatedFiles.forEach((f) => fileMap.set(f.file_key, f));
      allRelatedFiles = Array.from(fileMap.values());
    }
  }

  return {
    files: allRelatedFiles,
    total,
    page,
    pageSize,
    totalPages,
  };
};

export const deleteSingleFile = async (userId: string, fileKey: string) => {
  if (!fileKey) throw new HttpError(400, 'Missing or invalid fileKey');

  const supabase = createSupabaseAdminClient();
  const { data: fileRecord, error: fileError } = await supabase
    .from('files')
    .select('user_id, id')
    .eq('user_id', userId)
    .eq('file_key', fileKey)
    .limit(1)
    .single();

  if (fileError || !fileRecord) throw new HttpError(404, 'File not found');
  if (fileRecord.user_id !== userId) throw new HttpError(403, 'Unauthorized access to the file');

  await deleteObject(fileKey);
  const { error: deleteError } = await supabase.from('files').delete().eq('id', fileRecord.id);
  if (deleteError) throw new Error(deleteError.message);

  return { message: 'File deleted successfully' };
};

export const purgeFiles = async (userId: string, fileKeys: string[]) => {
  if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
    throw new HttpError(400, 'fileKeys array cannot be empty');
  }
  if (fileKeys.length > 100) {
    throw new HttpError(400, 'Cannot delete more than 100 files at once');
  }
  if (!fileKeys.every((key) => typeof key === 'string')) {
    throw new HttpError(400, 'All fileKeys must be strings');
  }

  const supabase = createSupabaseAdminClient();
  const { data: fileRecords, error: fileError } = await supabase
    .from('files')
    .select('id, user_id, file_key')
    .eq('user_id', userId)
    .in('file_key', fileKeys)
    .is('deleted_at', null);

  if (fileError) throw new Error(fileError.message);
  if (!fileRecords || fileRecords.length === 0) throw new HttpError(404, 'No matching files found');

  const unauthorizedFiles = fileRecords.filter((record) => record.user_id !== userId);
  if (unauthorizedFiles.length > 0)
    throw new HttpError(403, 'Unauthorized access to one or more files');

  const results = await Promise.allSettled(
    fileRecords.map(async (fileRecord) => {
      try {
        await deleteObject(fileRecord.file_key);
        const { error: deleteError } = await supabase
          .from('files')
          .delete()
          .eq('id', fileRecord.id);
        if (deleteError) throw new Error(deleteError.message);
        return { fileKey: fileRecord.file_key, success: true };
      } catch (error) {
        return {
          fileKey: fileRecord.file_key,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
  );

  const success: string[] = [];
  const failed: Array<{ fileKey: string; error: string }> = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) success.push(result.value.fileKey);
      else
        failed.push({
          fileKey: result.value.fileKey,
          error: result.value.error || 'Unknown error',
        });
    } else {
      failed.push({ fileKey: 'unknown', error: result.reason?.message || 'Promise rejected' });
    }
  });

  const foundFileKeys = new Set(fileRecords.map((record) => record.file_key));
  const notFoundKeys = fileKeys.filter((key) => !foundFileKeys.has(key));
  notFoundKeys.forEach((key) =>
    failed.push({ fileKey: key, error: 'File not found or already deleted' }),
  );

  return {
    success,
    failed,
    deletedCount: success.length,
    failedCount: failed.length,
  };
};

export const getStorageStats = async (userId: string, token: string) => {
  const supabase = createSupabaseAdminClient();
  const { data: totalStats, error: totalError } = await supabase
    .from('files')
    .select('file_size')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (totalError) throw new Error(totalError.message);

  const totalFiles = totalStats?.length || 0;
  const totalSize = totalStats?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
  const { usage, quota } = getStoragePlanData(token);
  const usagePercentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

  const { data: bookHashStats, error: bookHashError } = await supabase.rpc(
    'get_storage_by_book_hash',
    {
      p_user_id: userId,
    },
  );

  let byBookHash: Array<{ bookHash: string | null; fileCount: number; totalSize: number }> = [];
  if (bookHashError) {
    const { data: allFiles } = await supabase
      .from('files')
      .select('book_hash, file_size')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (allFiles) {
      const grouped = new Map<string | null, { count: number; size: number }>();
      allFiles.forEach((file) => {
        const key = file.book_hash;
        const current = grouped.get(key) || { count: 0, size: 0 };
        grouped.set(key, { count: current.count + 1, size: current.size + file.file_size });
      });
      byBookHash = Array.from(grouped.entries())
        .map(([bookHash, stats]) => ({ bookHash, fileCount: stats.count, totalSize: stats.size }))
        .sort((a, b) => b.totalSize - a.totalSize);
    }
  } else if (bookHashStats) {
    byBookHash = bookHashStats;
  }

  return {
    totalFiles,
    totalSize,
    usage,
    quota,
    usagePercentage,
    byBookHash,
  };
};
