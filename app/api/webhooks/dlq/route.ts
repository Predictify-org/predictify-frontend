import { NextResponse } from 'next/server';
import { logger, withCorrelationContext, getCorrelationContext } from '@/app/lib/logger';
import { webhookDeliveryStore } from '@/app/lib/webhook-delivery-store';

/**
 * GET /api/webhooks/dlq
 * View Dead Letter Queue entries
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');

  withCorrelationContext({
    correlation_id: request.headers.get('X-Correlation-ID') || `api-${crypto.randomUUID()}`,
    request_id: `req-${crypto.randomUUID()}`,
  });

  const context = getCorrelationContext();

  try {
    let dlqEntries = webhookDeliveryStore.getAllDLQEntries();

    if (since) {
      const sinceTime = new Date(since);
      dlqEntries = webhookDeliveryStore.getDLQEntriesSince(sinceTime);
    }

    logger.info('Fetching DLQ entries', {
      count: dlqEntries.length,
      since,
      correlation_id: context?.correlation_id,
    });

    const formatted = dlqEntries.map(entry => ({
      dlqId: entry.id,
      deliveryId: entry.deliveryId,
      endpointId: entry.endpointId,
      endpointUrl: entry.endpointUrl,
      eventId: entry.eventId,
      eventType: entry.eventType,
      reason: entry.reason,
      lastAttempt: {
        attemptNumber: entry.lastAttempt.attemptNumber,
        statusCode: entry.lastAttempt.statusCode,
        error: entry.lastAttempt.error,
        timestamp: entry.lastAttempt.timestamp,
      },
      createdAt: entry.createdAt,
      // Replay state — present once the entry has been successfully replayed.
      replayedDeliveryId: entry.replayedDeliveryId ?? null,
      replayedAt: entry.replayedAt ?? null,
    }));

    return NextResponse.json({
      data: formatted,
      pagination: {
        total: formatted.length,
        count: formatted.length,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching DLQ entries', {
      error: errorMsg,
      correlation_id: context?.correlation_id,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
