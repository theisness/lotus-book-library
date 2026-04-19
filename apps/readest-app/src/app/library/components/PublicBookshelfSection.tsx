import clsx from 'clsx';
import { MdChevronRight } from 'react-icons/md';
import { Book } from '@/types/book';
import { LibraryCoverFitType, LibraryViewModeType } from '@/types/settings';
import { useTranslation } from '@/hooks/useTranslation';
import BookshelfItem from './BookshelfItem';
import Spinner from '@/components/Spinner';

interface PublicBookshelfSectionProps {
  books: Book[];
  loading: boolean;
  collapsed: boolean;
  onToggle: () => void;
  mode: LibraryViewModeType;
  coverFit: LibraryCoverFitType;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleShowDetailsBook: (book: Book) => void;
}

const PublicBookshelfSection: React.FC<PublicBookshelfSectionProps> = ({
  books,
  loading,
  collapsed,
  onToggle,
  mode,
  coverFit,
  setLoading,
  handleShowDetailsBook,
}) => {
  const _ = useTranslation();

  if (!loading && books.length === 0) {
    return null;
  }

  return (
    <section className='mt-6 px-4 sm:px-2'>
      <button
        type='button'
        onClick={onToggle}
        className='bg-base-100 hover:bg-base-300/60 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left shadow-sm transition-colors'
        aria-expanded={!collapsed}
        aria-label={_('Public Bookshelf')}
      >
        <div className='flex items-center gap-2'>
          <MdChevronRight
            className={clsx('transition-transform duration-200', !collapsed && 'rotate-90')}
          />
          <span className='text-base font-semibold'>{_('公共书架')}</span>
        </div>
        <span className='text-base-content/60 text-sm'>{books.length}</span>
      </button>
      {!collapsed && (
        <div className='pt-4'>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Spinner loading />
            </div>
          ) : (
            <div
              className={clsx(
                'bookshelf-items',
                mode === 'grid' &&
                  'grid gap-x-2 gap-y-0 [grid-template-columns:repeat(auto-fill,160px)]',
                mode === 'list' && 'flex flex-col',
              )}
            >
              {books.map((book) => (
                <BookshelfItem
                  key={`public-library-item-${book.hash}`}
                  item={book}
                  mode={mode}
                  coverFit={coverFit}
                  isSelectMode={false}
                  itemSelected={false}
                  setLoading={setLoading}
                  toggleSelection={() => undefined}
                  handleGroupBooks={() => undefined}
                  handleBookUpload={async () => false}
                  handleBookDownload={async () => false}
                  handleBookDelete={async () => false}
                  handleSetSelectMode={() => undefined}
                  handleShowDetailsBook={handleShowDetailsBook}
                  handleLibraryNavigation={() => undefined}
                  handleUpdateReadingStatus={async () => undefined}
                  transferProgress={null}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PublicBookshelfSection;
