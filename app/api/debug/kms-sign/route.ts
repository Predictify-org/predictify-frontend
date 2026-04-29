import { NextResponse } from 'next/server';
import { getSigner } from '@/app/lib/kms/factory';

/**
 * DEBUG API: Test KMS Signing
 * 
 * This endpoint demonstrates the KMS signing flow and measures latency.
 * DO NOT USE IN PRODUCTION.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const signer = getSigner();
    const provider = signer.getProviderName();
    
    const start = Date.now();
    
    // Convert string payload to Buffer
    const buffer = Buffer.from(payload);
    
    // Sign the payload
    const signature = await signer.sign(buffer, {
      auditContext: {
        request_path: '/api/debug/kms-sign',
        actor: 'debug-admin'
      }
    });
    
    const duration = Date.now() - start;
    const publicKey = await signer.getPublicKey();

    return NextResponse.json({
      success: true,
      provider,
      publicKey,
      signature: signature.toString('hex'),
      latency_ms: duration,
      message: `Signed using ${provider}`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
