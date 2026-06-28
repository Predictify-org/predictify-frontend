import { PostgresWebhookSubscriptionStore } from '@/app/lib/webhook-store';

class FakeSqlExecutor {
  public rows: Array<Record<string, unknown>> = [];

  async query<TResult = unknown>(sql: string, params: readonly unknown[] = []): Promise<{ rows: TResult[] }> {
    if (sql.startsWith('insert into webhook_subscriptions')) {
      const [id, url, eventTypes, secret, description, status, createdAt, updatedAt] = params as [string, string, string, string | null, string | null, string, string, string];
      const record = {
        id,
        url,
        event_types: eventTypes,
        secret,
        description,
        status,
        created_at: createdAt,
        updated_at: updatedAt,
      };
      this.rows.push(record);
      return { rows: [record as TResult] };
    }

    if (sql.includes('where id =')) {
      const [id] = params as [string];
      const row = this.rows.find((entry) => entry.id === id);
      return { rows: row ? [row as TResult] : [] };
    }

    if (sql.startsWith('select id, url, event_types')) {
      const [eventType] = params as [string];
      if (eventType) {
        const normalizedEventType = eventType.replace(/^%|%$/g, '');
        const rows = this.rows.filter((entry) => {
          const eventTypes = (entry.event_types as string) ?? '[]';
          return eventTypes.includes(normalizedEventType);
        });
        return { rows: rows as TResult[] };
      }

      return { rows: [...this.rows] as TResult[] };
    }

    if (sql.startsWith('update webhook_subscriptions')) {
      const [id, url, eventTypes, secret, description, status, updatedAt] = params as [string, string, string, string | null, string | null, string, string];
      const existingIndex = this.rows.findIndex((entry) => entry.id === id);
      if (existingIndex === -1) {
        return { rows: [] };
      }
      const updated = {
        id,
        url,
        event_types: eventTypes,
        secret,
        description,
        status,
        created_at: this.rows[existingIndex].created_at,
        updated_at: updatedAt,
      };
      this.rows[existingIndex] = updated;
      return { rows: [updated as TResult] };
    }

    if (sql.startsWith('delete from webhook_subscriptions')) {
      const [id] = params as [string];
      const existingIndex = this.rows.findIndex((entry) => entry.id === id);
      if (existingIndex === -1) {
        return { rows: [] };
      }
      this.rows.splice(existingIndex, 1);
      return { rows: [{ id } as TResult] };
    }

    return { rows: [] };
  }
}

describe('PostgresWebhookSubscriptionStore', () => {
  it('persists and lists webhook subscriptions by event type', async () => {
    const executor = new FakeSqlExecutor();
    const store = new PostgresWebhookSubscriptionStore(executor);

    const created = await store.create({
      url: 'https://example.com/webhooks',
      eventTypes: ['stream.created'],
      description: 'GrantFox sync',
      status: 'active',
    });

    expect(created.id).toBeDefined();
    expect(created.url).toBe('https://example.com/webhooks');

    const listed = await store.list({ eventType: 'stream.created' });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
  });

  it('rejects invalid URLs and empty event types', async () => {
    const executor = new FakeSqlExecutor();
    const store = new PostgresWebhookSubscriptionStore(executor);

    await expect(
      store.create({
        url: 'not-a-url',
        eventTypes: ['stream.created'],
        status: 'active',
      }),
    ).rejects.toThrow('Invalid webhook URL');

    await expect(
      store.create({
        url: 'https://example.com/webhooks',
        eventTypes: [],
        status: 'active',
      }),
    ).rejects.toThrow('At least one event type is required');
  });
});
