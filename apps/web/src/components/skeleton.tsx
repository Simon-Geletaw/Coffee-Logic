'use client';

/* ─── Base Skeleton Block ─────────────────────────────────────────────── */
type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

function SkeletonBlock({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

/* ─── Table Skeleton ─────────────────────────────────────────────────── */
type TableSkeletonProps = {
  rows?: number;
  cols?: number;
  hasActions?: boolean;
};

export function TableSkeleton({ rows = 5, cols = 6, hasActions = false }: TableSkeletonProps) {
  const totalCols = hasActions ? cols + 1 : cols;
  return (
    <table className="data-table" aria-label="Loading data…" aria-busy="true">
      <thead>
        <tr>
          {Array.from({ length: totalCols }).map((_, i) => (
            <th key={i}>
              <SkeletonBlock style={{ height: 12, width: i === 0 ? 80 : 60, borderRadius: 4 }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {Array.from({ length: totalCols }).map((_, colIdx) => (
              <td key={colIdx}>
                {hasActions && colIdx === totalCols - 1 ? (
                  <SkeletonBlock style={{ height: 28, width: 60, borderRadius: 6 }} />
                ) : (
                  <SkeletonBlock
                    style={{
                      height: 14,
                      width: colIdx === 0 ? 70 + (rowIdx % 3) * 15 : 40 + (colIdx * 10) % 30,
                      borderRadius: 4,
                    }}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Stat Card Skeleton ─────────────────────────────────────────────── */
export function CardSkeleton() {
  return (
    <div className="stat-card" aria-hidden>
      <SkeletonBlock style={{ height: 12, width: 80, borderRadius: 4, marginBottom: 12 }} />
      <SkeletonBlock style={{ height: 32, width: 56, borderRadius: 6 }} />
      <SkeletonBlock style={{ height: 10, width: 96, borderRadius: 4, marginTop: 8 }} />
    </div>
  );
}

/* ─── Form Row Skeleton ──────────────────────────────────────────────── */
export function FormRowSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div
      style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}
      aria-hidden
    >
      {Array.from({ length: rows * 2 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBlock style={{ height: 10, width: 64, borderRadius: 4 }} />
          <SkeletonBlock style={{ height: 36, width: '100%', borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}
