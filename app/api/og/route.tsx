import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * API Route: /api/og
 * 
 * Generates dynamic Open Graph and Twitter Card images for individual market pages.
 * Composes UI based on the design tokens and layout from MarketShareCard.tsx.
 * 
 * Performance:
 * - Edge runtime for low latency.
 * - Local font and no external dependency lookups.
 * - Optimized < 800ms cold start target.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract dynamic market data from query params
    const title = searchParams.get('title') || 'Prediction Market';
    const status = searchParams.get('status') || 'active';
    const outcome = searchParams.get('outcome') || '';
    const probability = searchParams.get('probability') || '0';
    const volume = searchParams.get('volume') || '0 USDC';
    const timeLeft = searchParams.get('timeLeft') || '--';
    const winner = searchParams.get('winner') || '';

    // Load Inter font subset from public assets
    // Using import.meta.url to resolve relative to the server environment
    const fontData = await fetch(
      new URL('../../../../public/fonts/Inter.ttf', import.meta.url)
    ).then((res) => {
      if (!res.ok) throw new Error('Font not found');
      return res.arrayBuffer();
    });

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0F0E1C',
            color: 'white',
            padding: '80px',
            position: 'relative',
            fontFamily: 'Inter',
          }}
        >
          {/* Background Gradient Orbs (Mimicking blur effects with radial gradients) */}
          <div
            style={{
              position: 'absolute',
              top: '-150px',
              right: '-150px',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0) 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              left: '-100px',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, rgba(79, 70, 229, 0) 70%)',
              borderRadius: '50%',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 10 }}>
            {/* Header: Brand Identity */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#7C3AED',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    marginRight: '16px',
                  }}
                >
                  P
                </div>
                <span style={{ fontSize: '36px', fontWeight: 'bold', tracking: '-0.02em' }}>Predictify</span>
              </div>
              <div
                style={{
                  padding: '10px 24px',
                  borderRadius: '100px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '16px',
                  letterSpacing: '0.12em',
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                }}
              >
                Prediction Market
              </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {/* Title with truncation support (max 3 lines) */}
              <h1
                style={{
                  fontSize: '68px',
                  lineHeight: 1.15,
                  fontWeight: 'bold',
                  marginBottom: '48px',
                  width: '100%',
                  display: 'flex',
                }}
              >
                {title.length > 80 ? title.substring(0, 77) + '...' : title}
              </h1>

              {/* Status-Specific Visuals */}
              {status === 'active' ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', marginRight: '80px' }}>
                    <span style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                      Current Odds
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '100px', fontWeight: 'bold', color: '#10B981', lineHeight: 1 }}>{probability}%</span>
                      <span style={{ fontSize: '56px', marginLeft: '24px', color: 'rgba(255, 255, 255, 0.8)' }}>{outcome}</span>
                    </div>
                  </div>

                  <div style={{ height: '110px', width: '2px', backgroundColor: 'rgba(255, 255, 255, 0.1)', marginRight: '80px' }} />

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Volume</span>
                      <span style={{ fontSize: '36px', fontWeight: 'bold' }}>{volume}</span>
                    </div>
                    <div style={{ fontSize: '24px', color: '#FBBF24', display: 'flex' }}>
                      Closes in {timeLeft}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ padding: '16px 32px', borderRadius: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', marginRight: '40px' }}>
                    <span style={{ color: '#10B981', fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase' }}>Resolved</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Winning Outcome</span>
                    <span style={{ fontSize: '64px', fontWeight: 'bold' }}>{winner || outcome}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic', marginBottom: '6px' }}>
                  * This is a prediction market. Probability based on real-time trades.
                </span>
                <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold' }}>predictify.app</span>
              </div>
              <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.3)' }}>
                Generated on {new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error: any) {
    console.error('OG Image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
