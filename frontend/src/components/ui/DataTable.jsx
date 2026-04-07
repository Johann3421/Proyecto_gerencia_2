import { useState } from 'react';

export default function DataTable({
  columns, data, total, page, totalPages, onPageChange,
  onRowClick, rowClassName, emptyMessage = 'No hay datos',
}) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : {}}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={rowClassName ? rowClassName(row) : ''}
                onClick={() => onRowClick?.(row)}
                style={onRowClick ? { cursor: 'pointer' } : {}}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.mono ? 'mono' : ''}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <span>
            {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} de {total}
          </span>
          <div className="pagination-btns">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ‹
            </button>
            {pages.slice(Math.max(0, page - 3), page + 2).map((p) => (
              <button
                key={p}
                className={p === page ? 'active' : ''}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
