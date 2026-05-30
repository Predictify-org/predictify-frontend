import { NextResponse } from "next/server";
import { tryAuthenticateRequest, createErrorResponse } from "@/app/lib/auth";
import { db } from "@/app/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const auth = tryAuthenticateRequest(request);
  if (auth.error) return createErrorResponse("UNAUTHORIZED", auth.error, 401);
  const { walletAddress } = auth as { walletAddress: string };

  const isMember = db.members.has(`${orgId}:${walletAddress}`);
  if (!isMember) return createErrorResponse("FORBIDDEN", "You are not a member of this organization", 403);

  const members = Array.from(db.members.values()).filter(m => m.orgId === orgId);
  return NextResponse.json({ data: members });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const auth = tryAuthenticateRequest(request);
  if (auth.error) return createErrorResponse("UNAUTHORIZED", auth.error, 401);
  const { walletAddress } = auth as { walletAddress: string };

  const org = db.orgs.get(orgId);
  if (!org) return createErrorResponse("NOT_FOUND", "Organization not found", 404);

  if (org.ownerWallet !== walletAddress) return createErrorResponse("FORBIDDEN", "Only the owner can add members", 403);

  const { walletAddress: newMemberWallet } = await request.json();
  db.members.set(`${orgId}:${newMemberWallet}`, { orgId, walletAddress: newMemberWallet, role: 'member' });

  return NextResponse.json({ data: db.members.get(`${orgId}:${newMemberWallet}`) }, { status: 201 });
}
