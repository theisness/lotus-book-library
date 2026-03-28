import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import {
  createUploadSession,
  deleteSingleFile,
  getDownloadUrls,
  getStorageStats,
  listFiles,
  purgeFiles,
} from '../services/storage.service.js';

export const storageRouter = Router();

storageRouter.use(requireAuth);

storageRouter.post(
  '/upload',
  asyncHandler(async (req, res) => {
    const { user, token } = (req as AuthenticatedRequest).auth!;
    const result = await createUploadSession({
      userId: user.id,
      token,
      fileName: req.body?.fileName,
      fileSize: req.body?.fileSize,
      bookHash: req.body?.bookHash,
      temp: req.body?.temp,
    });
    res.status(200).json(result);
  }),
);

storageRouter.get(
  '/download',
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    let fileKey = req.query['fileKey'];
    if (req.originalUrl.includes('fileKey=') && req.originalUrl.includes('&')) {
      const fileKeyFromUrl = req.originalUrl
        .substring(req.originalUrl.indexOf('fileKey=') + 8)
        .replace(/\+/g, '%20')
        .replace(/&/g, '%26')
        .replace(/=$/, '');
      fileKey = decodeURIComponent(fileKeyFromUrl);
    }
    if (!fileKey || typeof fileKey !== 'string') {
      throw new HttpError(400, 'Missing or invalid fileKey');
    }
    const downloadUrls = await getDownloadUrls(user.id, [fileKey]);
    const downloadUrl = downloadUrls[fileKey];
    if (!downloadUrl) {
      throw new HttpError(404, 'File not found');
    }
    res.status(200).json({ downloadUrl });
  }),
);

storageRouter.post(
  '/download',
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const downloadUrls = await getDownloadUrls(user.id, req.body?.fileKeys);
    res.status(200).json({ downloadUrls });
  }),
);

storageRouter.get(
  '/list',
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const result = await listFiles(user.id, {
      page: req.query['page'] ? parseInt(String(req.query['page']), 10) : undefined,
      pageSize: req.query['pageSize'] ? parseInt(String(req.query['pageSize']), 10) : undefined,
      sortBy: req.query['sortBy'] ? String(req.query['sortBy']) : undefined,
      sortOrder: req.query['sortOrder'] ? String(req.query['sortOrder']) : undefined,
      bookHash: req.query['bookHash'] ? String(req.query['bookHash']) : undefined,
      search: req.query['search'] ? String(req.query['search']) : undefined,
    });
    res.status(200).json(result);
  }),
);

storageRouter.delete(
  '/delete',
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const result = await deleteSingleFile(user.id, String(req.query['fileKey'] || ''));
    res.status(200).json(result);
  }),
);

storageRouter.delete(
  '/purge',
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const result = await purgeFiles(user.id, req.body?.fileKeys);
    const statusCode =
      result.failed.length > 0 && result.success.length > 0
        ? 207
        : result.failed.length > 0
          ? 500
          : 200;
    res.status(statusCode).json(result);
  }),
);

storageRouter.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { user, token } = (req as AuthenticatedRequest).auth!;
    const result = await getStorageStats(user.id, token);
    res.status(200).json(result);
  }),
);
