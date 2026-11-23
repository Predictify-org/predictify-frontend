'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExportColumn } from '@/lib/export/csv';
import { toCsv } from '@/lib/export/csv';
import { downloadBlob } from '@/lib/export/download';
import { toJson } from '@/lib/export/json';
import { useToast } from '@/hooks/use-toast';

interface ExportMenuProps<T> {
  rows: readonly T[];
  columns: readonly ExportColumn<T>[];
  filename: string;
  hideBalances?: boolean;
  sensitiveColumns?: readonly ExportColumn<T>['key'][];
}

const MASKED_VALUE = 'Hidden';

export function ExportMenu<T extends object>({
  rows,
  columns,
  filename,
  hideBalances = false,
  sensitiveColumns = [],
}: ExportMenuProps<T>) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    () => columns.map(({ key }) => key)
  );
  const { toast } = useToast();
  const selectedColumns = columns.filter(({ key }) => selectedKeys.includes(key));
  const exportRows = hideBalances && sensitiveColumns.length > 0
    ? rows.map((row) => {
        const maskedRow = { ...row };
        for (const key of sensitiveColumns) {
          if (key in maskedRow) {
            Object.assign(maskedRow, { [key]: MASKED_VALUE });
          }
        }
        return maskedRow;
      })
    : rows;

  const exportFile = (format: 'csv' | 'json') => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const content = format === 'csv'
        ? toCsv(exportRows, selectedColumns)
        : toJson(exportRows, selectedColumns);

      downloadBlob(
        `${filename}-${date}.${format}`,
        format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
        content
      );
    } catch (error) {
      console.error('Failed to export data', error);
      toast({
        title: 'Export failed',
        description: 'The file could not be downloaded. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Choose columns</DropdownMenuLabel>
        {columns.map(({ key, label }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={selectedKeys.includes(key)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => {
              setSelectedKeys((current) =>
                checked
                  ? [...current, key]
                  : current.filter((selectedKey) => selectedKey !== key)
              );
            }}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex gap-2 p-1">
          <Button type="button" size="sm" className="flex-1" onClick={() => exportFile('csv')}>
            CSV
          </Button>
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => exportFile('json')}>
            JSON
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
