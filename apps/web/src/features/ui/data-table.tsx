import type { ReactNode } from 'react';

type DataTableProps = {
  header: ReactNode;
  children: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  colCount?: number;
};

export function DataTable({ header, children, empty, loading = false, skeletonRows = 8, colCount = 6 }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          {header}
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {Array.from({ length: colCount }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              : children}
            {!loading && empty ? (
              <tr className="border-t border-slate-100">
                <td colSpan={colCount} className="px-4 py-8">
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

