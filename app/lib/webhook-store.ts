import { randomUUID } from 'crypto';

export interface WebhookSubscription {
  id: string;
  url: string;
  eventTypes: string[];
  secret?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookSubscriptionInput {
  url: string;
  eventTypes: string[];
  secret?: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface ListWebhookSubscriptionsInput {
  eventType?: string;
  status?: 'active' | 'inactive';
}

export interface SqlExecutor {
  query<TResult = unknown>(sql: string, params?: readonly unknown[]): Promise<{ rows: TResult[] }>;
}

export class PostgresWebhookSubscriptionStore {
  constructor(private readonly executor: SqlExecutor) {}

  async create(input: CreateWebhookSubscriptionInput): Promise<WebhookSubscription> {
    this.validateCreateInput(input);

    const now = new Date().toISOString();
    const subscription: WebhookSubscription = {
      id: `whs_${randomUUID()}`,
      url: input.url.trim(),
      eventTypes: input.eventTypes.map((eventType) => eventType.trim()).filter(Boolean),
      secret: input.secret?.trim() ?? null,
      description: input.description?.trim() ?? null,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };

    await this.executor.query(
      `insert into webhook_subscriptions (id, url, event_types, secret, description, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        subscription.id,
        subscription.url,
        JSON.stringify(subscription.eventTypes),
        subscription.secret,
        subscription.description,
        subscription.status,
        subscription.createdAt,
        subscription.updatedAt,
      ],
    );

    return subscription;
  }

  async get(id: string): Promise<WebhookSubscription | null> {
    const result = await this.executor.query<{
      id: string;
      url: string;
      event_types: string;
      secret: string | null;
      description: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>(
      `select id, url, event_types, secret, description, status, created_at, updated_at
       from webhook_subscriptions where id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  async list(input: ListWebhookSubscriptionsInput = {}): Promise<WebhookSubscription[]> {
    const { eventType, status } = input;

    let sql = `select id, url, event_types, secret, description, status, created_at, updated_at from webhook_subscriptions`;
    const params: unknown[] = [];

    if (eventType || status) {
      sql += ` where`;
      const clauses: string[] = [];

      if (eventType) {
        clauses.push(` event_types::text like $${params.length + 1}`);
        params.push(`%${eventType}%`);
      }

      if (status) {
        clauses.push(` status = $${params.length + 1}`);
        params.push(status);
      }

      sql += ` ${clauses.join(' and ')}`;
    }

    const result = await this.executor.query<{
      id: string;
      url: string;
      event_types: string;
      secret: string | null;
      description: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>(sql, params);

    return result.rows.map((row) => this.mapRow(row));
  }

  async update(id: string, input: Partial<CreateWebhookSubscriptionInput>): Promise<WebhookSubscription | null> {
    const existing = await this.get(id);
    if (!existing) {
      return null;
    }

    const next: WebhookSubscription = {
      ...existing,
      ...input,
      url: input.url?.trim() ?? existing.url,
      eventTypes: input.eventTypes ? input.eventTypes.map((eventType) => eventType.trim()).filter(Boolean) : existing.eventTypes,
      secret: input.secret === undefined ? existing.secret : input.secret?.trim() ?? null,
      description: input.description === undefined ? existing.description : input.description?.trim() ?? null,
      status: input.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };

    this.validateCreateInput({
      url: next.url,
      eventTypes: next.eventTypes,
      secret: next.secret,
      description: next.description,
      status: next.status,
    });

    await this.executor.query(
      `update webhook_subscriptions
       set url = $2, event_types = $3, secret = $4, description = $5, status = $6, updated_at = $7
       where id = $1`,
      [
        id,
        next.url,
        JSON.stringify(next.eventTypes),
        next.secret,
        next.description,
        next.status,
        next.updatedAt,
      ],
    );

    return next;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.executor.query<{ id: string }>(
      `delete from webhook_subscriptions where id = $1`,
      [id],
    );

    return result.rows.length > 0;
  }

  private mapRow(row: { id: string; url: string; event_types: string; secret: string | null; description: string | null; status: string; created_at: string; updated_at: string }): WebhookSubscription {
    const eventTypes = this.normalizeEventTypes(row.event_types);

    return {
      id: row.id,
      url: row.url,
      eventTypes,
      secret: row.secret,
      description: row.description,
      status: row.status as 'active' | 'inactive',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeEventTypes(value: string): string[] {
    if (!value) {
      return [];
    }

    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter((entry): entry is string => typeof entry === 'string');
        }
      } catch {
        // Fall back to a simple split if the value is not JSON.
      }
    }

    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }

  private validateCreateInput(input: CreateWebhookSubscriptionInput): void {
    if (!input.url || !this.isValidUrl(input.url)) {
      throw new Error('Invalid webhook URL');
    }

    const eventTypes = (input.eventTypes ?? []).map((eventType) => eventType.trim()).filter(Boolean);
    if (eventTypes.length === 0) {
      throw new Error('At least one event type is required');
    }

    if (input.status && !['active', 'inactive'].includes(input.status)) {
      throw new Error('Invalid subscription status');
    }
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }
}
