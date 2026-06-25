import { NextResponse } from "next/server";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { errorResponse } from "@/app/lib/errors/index";
import { db } from "@/app/lib/db";
import type { Member } from "@/app/types/org";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const auth = tryAuthenticateRequest(request);
  if (!auth) return errorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);

  const { walletAddress } = auth;

  const isMember = db.members.has(`${orgId}:${walletAddress}`);
  if (!isMember) return errorResponse("FORBIDDEN", "You are not a member of this organization", 403);

  const members = Array.from(db.members.values() as Iterable<Member>).filter((m) => m.orgId === orgId);
  return NextResponse.json({ data: members });
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const auth = tryAuthenticateRequest(request);
  if (!auth) return errorResponse("UNAUTHORIZED", "Missing or invalid authorization header", 401);

  const { walletAddress } = auth;

  const org = db.orgs.get(orgId);
  if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404);

  if (org.ownerWallet !== walletAddress) return errorResponse("FORBIDDEN", "Only the owner can add members", 403);

  const { walletAddress: newMemberWallet } = await request.json();
  db.members.set(`${orgId}:${newMemberWallet}`, { orgId, walletAddress: newMemberWallet, role: 'member' });

  return NextResponse.json({ data: db.members.get(`${orgId}:${newMemberWallet}`) }, { status: 201 });
}
