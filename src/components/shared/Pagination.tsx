import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Real pagination: only renders pages that exist. */
export function Pagination({
  page,
  pages,
  onChange,
  label = 'Phân trang kết quả',
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
  label?: string;
}) {
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );
  return (
    <nav className="pager" aria-label={label}>
      <button
        type="button"
        className="pager__btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <ChevronLeft size={15} aria-hidden="true" />
      </button>
      {nums.map((n, i) => (
        <span key={n} className="pager__slot">
          {i > 0 && n - nums[i - 1] > 1 && (
            <span className="pager__gap" aria-hidden="true">
              …
            </span>
          )}
          <button
            type="button"
            className="pager__btn"
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Trang ${n}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        type="button"
        className="pager__btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Trang sau"
      >
        <ChevronRight size={15} aria-hidden="true" />
      </button>
    </nav>
  );
}
