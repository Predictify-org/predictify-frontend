import { NextResponse } from 'next/server';
import { logger, withCorrelationContext, getCorrelationContext } from '@/app/lib/logger';
import { webhookDeliveryStore } from '@/app/lib/webhook-delivery-store';
import { decodeCursor, encodeCursor } from '@/app/lib/db';

/**
 * GET /api/webhooks/deliveries
 * List all webhook deliveries and their status with pagination
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const endpointId = searchParams.get('endpoint_id');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const context = {
    correlation_id: request.headers.get('X-Correlation-ID') || `api-${crypto.randomUUID()}`,
    request_id: `req-${crypto.randomUUID()}`,
  };

  return withCorrelationContext(context, async () => {
    try {
      logger.info('Fetching webhook deliveries', {
        status,
        endpoint_id: endpointId,
        cursor,
        limit,
        correlation_id: context.correlation_id,
      });

      let allDeliveries = webhookDeliveryStore.getAllDeliveries();

      // Filter by endpoint if provided
      if (endpointId) {
        allDeliveries = allDeliveries.filter(d => d.endpointId === endpointId);
      }

      // Filter by status if provided
      if (status) {
        allDeliveries = allDeliveries.filter(d => d.status === status);
      }

      // Sort by creation date descending (newest first)
      allDeliveries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      // Apply cursor pagination
      if (cursor) {
        const cursorId = decodeCursor(cursor);
        const cursorIndex = allDeliveries.findIndex(d => d.deliveryId === cursorId);
        if (cursorIndex >= 0) {
          allDeliveries = allDeliveries.slice(cursorIndex + 1);
        }
      }

      const paginated = allDeliveries.slice(0, limit);
      const hasNext = allDeliveries.length > limit;
      const nextCursor = hasNext && paginated.length > 0
        ? encodeCursor(paginated[paginated.length - 1].deliveryId)
        : null;

      const data = paginated.map(d => ({
        deliveryId: d.deliveryId,
        endpointUrl: d.endpointUrl,
        status: d.status,
        attempts: d.attempts.length,
        createdAt: d.createdAt,
        finalizedAt: d.finalizedAt,
      }));

      return NextResponse.json({
        data,
        links: {
          self: `/api/webhooks/deliveries?limit=${limit}${status ? `&status=${status}` : ''}${endpointId ? `&endpoint_id=${endpointId}` : ''}`,
        },
        meta: {
          hasNext,
          nextCursor,
          total: webhookDeliveryStore.getStatistics().totalDeliveries,
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching deliveries', {
        error: errorMsg,
        correlation_id: context.correlation_id,
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
