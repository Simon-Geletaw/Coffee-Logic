import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  
  if (totalItems <= pageSize) return null;

  return (
    <div className="pagination">
      <p className="pagination-info">
        Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)} of {totalItems}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
          .reduce<Array<number | '…'>>((acc, p, idx, arr) => {
            if (idx > 0) {
              const prev = arr[idx - 1];
              if (typeof prev === 'number' && p - prev > 1) acc.push('…');
            }
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === '…' ? (
              <span
                key={`ellipsis-${idx}`}
                className="pagination-btn"
                style={{ cursor: 'default', opacity: 0.5, pointerEvents: 'none' }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`pagination-btn${item === safePage ? ' active' : ''}`}
                onClick={() => onPageChange(item as number)}
                aria-label={`Page ${item}`}
                aria-current={item === safePage ? 'page' : undefined}
              >
                {item}
              </button>
            ),
          )}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
