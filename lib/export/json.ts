import type { ExportColumn } from './csv';

export function toJson<T>(
  rows: readonly T[],
  columns: readonly ExportColumn<T>[]
): string {
  const selectedRows = rows.map((row) =>
    Object.fromEntries(
      columns.map(({ key }) => {
        const value = row[key];
        return [key, value instanceof Date ? value.toISOString() : value ?? null];
      })
    )
  );

  return JSON.stringify(selectedRows, null, 2);
}
