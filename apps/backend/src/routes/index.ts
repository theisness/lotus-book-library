import { Router } from 'express';
import { booksRouter } from './books.routes.js';
import { miscRouter } from './misc.routes.js';
import { publicBookRouter } from './public-book.routes.js';
import { publicRouter } from './public.routes.js';
import { storageRouter } from './storage.routes.js';
import { syncRouter } from './sync.routes.js';

export const apiRouter = Router();

apiRouter.use('/', miscRouter);
apiRouter.use('/books', booksRouter);
apiRouter.use('/publicBook', publicBookRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/storage', storageRouter);
apiRouter.use('/sync', syncRouter);
