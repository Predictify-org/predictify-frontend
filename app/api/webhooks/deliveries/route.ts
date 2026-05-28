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

  return withCorrelationContext(
    {
      correlation_id: request.headers.get('X-Correlation-ID') || `api-${crypto.randomUUID()}`,
      request_id: `req-${crypto.randomUUID()}`,
    },
    async () => {
      const context = getCorrelationContext();

      try {
        logger.info('Fetching webhook deliveries', {
          status,
          endpoint_id: endpointId,
          correlation_id: context?.correlation_id,
        });

        const allDeliveries = endpointId
          ? webhookDeliveryStore.getDeliveriesByEndpoint(endpointId)
          : webhookDeliveryStore.getAllDLQEntries().map(dlq => webhookDeliveryStore.getDelivery(dlq.deliveryId)).filter(Boolean);

        const filtered = status
          ? allDeliveries.filter(d => d?.status === status)
          : allDeliveries;

        const deliveries = filtered.map(d => ({
          deliveryId: d?.deliveryId,
          endpointUrl: d?.endpointUrl,
          status: d?.status,
          attempts: d?.attempts.length,
          createdAt: d?.createdAt,
          finalizedAt: d?.finalizedAt,
        }));

        return NextResponse.json({
          data: deliveries,
          pagination: {
            total: deliveries.length,
            count: deliveries.length,
          },
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error fetching deliveries', {
          error: errorMsg,
          correlation_id: context?.correlation_id,
        });
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  );
}
