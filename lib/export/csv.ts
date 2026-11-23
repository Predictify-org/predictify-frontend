export interface ExportColumn<T> {
  key: Extract<keyof T, string>;
  label: string;
}

export interface CsvOptions {
  bom?: boolean;
}

export function neutralizeFormula(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return String(cell);

  const value = cell instanceof Date ? cell.toISOString() : String(cell);
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function formatCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') {
    return Number.isFinite(cell) ? String(cell) : '';
  }
  return neutralizeFormula(cell);
}

function quoteCsvCell(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function toCsv<T>(
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
  opts: CsvOptions = {}
): string {
  const records = [
    columns.map((column) => quoteCsvCell(neutralizeFormula(column.label))).join(','),
    ...rows.map((row) =>
      columns
        .map((column) => quoteCsvCell(formatCell(row[column.key])))
        .join(',')
    ),
  ];

  return `${opts.bom ? '\uFEFF' : ''}${records.join('\r\n')}`;
}
