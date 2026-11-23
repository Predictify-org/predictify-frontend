import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMenu } from '../ExportMenu';
import { downloadBlob } from '@/lib/export/download';

jest.mock('@/lib/export/download', () => ({
  downloadBlob: jest.fn(),
}));

describe('ExportMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports selected columns as CSV and masks sensitive values in privacy mode', async () => {
    const user = userEvent.setup();
    render(
      <ExportMenu
        rows={[{ title: 'Market', amount: 45, status: 'active' }]}
        columns={[
          { key: 'title', label: 'Market' },
          { key: 'amount', label: 'Amount' },
          { key: 'status', label: 'Status' },
        ]}
        filename="predictify-positions"
        hideBalances
        sensitiveColumns={['amount']}
      />
    );

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Status' }));
    await user.click(screen.getByRole('button', { name: 'CSV' }));

    expect(downloadBlob).toHaveBeenCalledWith(
      expect.stringMatching(/^predictify-positions-\d{4}-\d{2}-\d{2}\.csv$/),
      'text/csv;charset=utf-8',
      'Market,Amount\r\nMarket,Hidden'
    );
  });

  it('exports JSON', async () => {
    const user = userEvent.setup();
    render(
      <ExportMenu
        rows={[{ title: 'Market' }]}
        columns={[{ key: 'title', label: 'Market' }]}
        filename="predictify-transactions"
      />
    );

    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('button', { name: 'JSON' }));

    expect(downloadBlob).toHaveBeenCalledWith(
      expect.stringMatching(/^predictify-transactions-\d{4}-\d{2}-\d{2}\.json$/),
      'application/json;charset=utf-8',
      '[\n  {\n    "title": "Market"\n  }\n]'
    );
  });
});
