'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  adminUploadPublicBook,
  listPublicBookShelf,
  unpublishPublicBook,
  updatePublicBook,
  type PublicBook,
} from '@/libs/publicBooks';
import { PiPlus, PiTrash, PiPencilSimple, PiArrowLeft } from 'react-icons/pi';

export default function AdminPublicBooksPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingBook, setEditingBook] = useState<PublicBook | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.replace('/library');
      return;
    }
    loadBooks();
  }, [user, isAdmin, router]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await listPublicBookShelf();
      setBooks(data);
    } finally {
      setLoading(false);
    }
  };
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const title = file.name.replace(/\.[^.]+$/, '');
      await adminUploadPublicBook(file, { title });
      await loadBooks();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (book: PublicBook) => {
    if (!confirm(`确定删除 "${book.title}"？`)) return;
    await unpublishPublicBook(book.book_hash);
    await loadBooks();
  };

  const handleEdit = (book: PublicBook) => {
    setEditingBook(book);
    setEditTitle(book.title || '');
    setEditAuthor(book.author || '');
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;
    await updatePublicBook(editingBook.book_hash, { title: editTitle, author: editAuthor });
    setEditingBook(null);
    await loadBooks();
  };

  if (!user || !isAdmin) return null;

  return (
    <div className='bg-base-100 min-h-screen p-6'>
      <div className='mx-auto max-w-4xl'>
        <div className='mb-6 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button onClick={() => router.back()} className='btn btn-ghost btn-sm'>
              <PiArrowLeft size={20} />
            </button>
            <h1 className='text-2xl font-bold'>公共书架管理</h1>
          </div>
          <label className={`btn btn-primary btn-sm ${uploading ? 'loading' : ''}`}>
            <PiPlus size={16} />
            {uploading ? '上传中...' : '上传书籍'}
            <input
              ref={fileInputRef}
              type='file'
              accept='.epub,.pdf,.mobi,.azw3,.fb2,.cbz'
              className='hidden'
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {loading ? (
          <div className='flex justify-center py-12'>
            <span className='loading loading-spinner loading-lg' />
          </div>
        ) : books.length === 0 ? (
          <div className='text-base-content/60 py-12 text-center'>暂无公共书籍</div>
        ) : (
          <div className='grid grid-cols-1 gap-4'>
            {books.map((book) => (
              <div key={book.id} className='bg-base-200 flex items-center gap-4 rounded-lg p-4'>
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title || ''}
                    className='h-20 w-14 rounded object-cover shadow'
                  />
                ) : (
                  <div className='bg-base-300 flex h-20 w-14 items-center justify-center rounded text-xs'>
                    {book.format?.toUpperCase()}
                  </div>
                )}
                <div className='min-w-0 flex-1'>
                  <h3 className='truncate font-semibold'>{book.title || '未命名'}</h3>
                  <p className='text-base-content/60 text-sm'>{book.author || '未知作者'}</p>
                  <p className='text-base-content/40 text-xs'>
                    {book.format?.toUpperCase()} ·{' '}
                    {new Date(book.published_at).toLocaleDateString()}
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button onClick={() => handleEdit(book)} className='btn btn-ghost btn-sm'>
                    <PiPencilSimple size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(book)}
                    className='btn btn-ghost btn-sm text-error'
                  >
                    <PiTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingBook && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-base-100 w-80 rounded-lg p-6'>
              <h3 className='mb-4 font-semibold'>编辑书籍信息</h3>
              <input
                className='input input-bordered mb-3 w-full'
                placeholder='标题'
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <input
                className='input input-bordered mb-4 w-full'
                placeholder='作者'
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
              />
              <div className='flex justify-end gap-2'>
                <button onClick={() => setEditingBook(null)} className='btn btn-ghost btn-sm'>
                  取消
                </button>
                <button onClick={handleSaveEdit} className='btn btn-primary btn-sm'>
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
