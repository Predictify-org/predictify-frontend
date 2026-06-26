-- Create webhook_delivery_status enum type
CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'dlq');

-- Create webhook_deliveries table
CREATE TABLE webhook_deliveries (
  delivery_id VARCHAR(255) PRIMARY KEY,
  endpoint_id VARCHAR(255) NOT NULL,
  endpoint_url TEXT NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  status webhook_delivery_status NOT NULL DEFAULT 'pending',
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ NULL
);

-- Index for scanning/claiming pending deliveries
CREATE INDEX webhook_deliveries_status_created_at_idx ON webhook_deliveries (status, created_at);

-- Create webhook_dlq table
CREATE TABLE webhook_dlq (
  id VARCHAR(255) PRIMARY KEY,
  delivery_id VARCHAR(255) NOT NULL UNIQUE REFERENCES webhook_deliveries(delivery_id) ON DELETE CASCADE,
  endpoint_id VARCHAR(255) NOT NULL,
  endpoint_url TEXT NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  reason TEXT NOT NULL,
  all_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_attempt JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL,
  replayed_delivery_id VARCHAR(255) NULL,
  replayed_at TIMESTAMPTZ NULL
);

-- Index for retrieving dlq entries by creation date
CREATE INDEX webhook_dlq_created_at_idx ON webhook_dlq (created_at DESC);

-- Create webhook_attempt_schedule table
CREATE TABLE webhook_attempt_schedule (
  schedule_id VARCHAR(255) PRIMARY KEY,
  delivery_id VARCHAR(255) NOT NULL REFERENCES webhook_deliveries(delivery_id) ON DELETE CASCADE,
  retry_at TIMESTAMPTZ NOT NULL
);

-- Index for finding due retries
CREATE INDEX webhook_attempt_schedule_retry_at_idx ON webhook_attempt_schedule (retry_at ASC);
