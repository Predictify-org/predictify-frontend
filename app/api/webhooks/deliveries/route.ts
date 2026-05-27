import { NextResponse } from 'next/server';
import { logger, withCorrelationContext, getCorrelationContext } from '@/app/lib/logger';
import { webhookDeliveryWorker } from '@/app/lib/webhook-delivery-worker';
import { webhookDeliveryStore } from '@/app/lib/webhook-delivery-store';

/**
 * GET /api/webhooks/deliveries
 * List all webhook deliveries and their status
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const endpointId = searchParams.get('endpoint_id');

  const context = {
    correlation_id: request.headers.get('X-Correlation-ID') || `api-${crypto.randomUUID()}`,
    request_id: `req-${crypto.randomUUID()}`,
  };

  return withCorrelationContext(context, async () => {
    const currentContext = getCorrelationContext();

    try {
      logger.info('Fetching webhook deliveries', {
        status,
        endpoint_id: endpointId,
        correlation_id: currentContext?.correlation_id,
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
        correlation_id: currentContext?.correlation_id,
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
