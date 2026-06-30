/**
 * GET  /api/streams/template        - List all templates
 * POST /api/streams/template        - Create a new template
 * GET  /api/streams/template/[id]   - Get a specific template (handled in [id]/route.ts)
 */

import { NextResponse } from "next/server";

interface StreamTemplate {
  id: string;
  name: string;
  asset: string;
  amountPerInterval: number;
  intervalSeconds: number;
  memo?: string;
  createdAt: string;
}

const templates = new Map<string, StreamTemplate>();

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET() {
  return NextResponse.json({ templates: Array.from(templates.values()) });
}

export async function POST(request: Request) {
  let body: Partial<StreamTemplate>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return createErrorResponse("MISSING_NAME", "Template name is required", 400);
  }
  if (!body.asset || typeof body.asset !== "string") {
    return createErrorResponse("MISSING_ASSET", "asset is required", 400);
  }
  if (!body.amountPerInterval || Number(body.amountPerInterval) <= 0) {
    return createErrorResponse("INVALID_AMOUNT", "amountPerInterval must be a positive number", 400);
  }
  if (!body.intervalSeconds || Number(body.intervalSeconds) <= 0) {
    return createErrorResponse("INVALID_INTERVAL", "intervalSeconds must be a positive number", 400);
  }

  const template: StreamTemplate = {
    id: `tpl_${Date.now()}`,
    name: body.name.trim(),
    asset: body.asset,
    amountPerInterval: Number(body.amountPerInterval),
    intervalSeconds: Number(body.intervalSeconds),
    memo: body.memo,
    createdAt: new Date().toISOString(),
  };

  templates.set(template.id, template);
  return NextResponse.json({ template }, { status: 201 });
}
