import { NextResponse } from 'next/server';

const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';

function getHorizonUrl(): string {
  return (
    process.env.STELLAR_HORIZON_URL ??
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ??
    DEFAULT_HORIZON_URL
  ).replace(/\/+$/, '');
}

export async function GET() {
  try {
    const response = await fetch(
      `${getHorizonUrl()}/ledgers?order=desc&limit=1`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      console.error('[ledger-time] Horizon rejected ledger access', {
        status: response.status,
      });

      return NextResponse.json(
        { error: 'Ledger time access is not permitted.' },
        { status: 403 }
      );
    }

    if (!response.ok) {
      console.error('[ledger-time] Horizon ledger request failed', {
        status: response.status,
      });

      return NextResponse.json(
        { error: 'Unable to retrieve ledger time.' },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const ledger = payload?._embedded?.records?.[0];

    const closedAt = ledger?.closed_at;
    const sequence = Number(ledger?.sequence);

    if (
      typeof closedAt !== 'string' ||
      Number.isNaN(new Date(closedAt).getTime()) ||
      !Number.isSafeInteger(sequence) ||
      sequence < 0
    ) {
      console.error('[ledger-time] Horizon returned an invalid ledger payload');

      return NextResponse.json(
        { error: 'Invalid ledger time response.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ledgerTime: closedAt,
        ledgerSequence: sequence,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch {
    console.error('[ledger-time] Ledger time request failed');

    return NextResponse.json(
      { error: 'Ledger time is temporarily unavailable.' },
      { status: 503 }
    );
  }
}