import { NextResponse } from 'next/server'

/**
 * Farcaster Mini App Manifest
 * Required for Base Mini App integration
 *
 * After deploying, generate accountAssociation credentials at:
 * https://www.base.dev/preview?tab=account
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://your-domain.com'

  const manifest = {
    accountAssociation: {
      // Populated from Base Build verification: https://www.base.dev/preview?tab=account
      header: process.env.FC_HEADER || '',
      payload: process.env.FC_PAYLOAD || '',
      signature: process.env.FC_SIGNATURE || '',
    },
    miniapp: {
      version: '1',
      name: 'Grid Games',
      homeUrl: baseUrl,
      iconUrl: `${baseUrl}/icon.svg`,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#000000',
      webhookUrl: `${baseUrl}/api/webhook`,
      subtitle: 'Real-time multiplayer trading',
      description:
        'Slice coins to predict BTC price movement. Challenge friends in real-time competitive trading.',
      screenshotUrls: [
        `${baseUrl}/screenshots/game-1.png`,
        `${baseUrl}/screenshots/game-2.png`,
        `${baseUrl}/screenshots/game-3.png`,
      ],
      primaryCategory: 'games',
      tags: ['trading', 'multiplayer', 'realtime', 'blockchain', 'competitive'],
      heroImageUrl: `${baseUrl}/og.png`,
      tagline: 'Predict. Slice. Win.',
      ogTitle: 'Grid Games - Real-time Trading Battles',
      ogDescription: 'Challenge friends in fast-paced crypto trading battles.',
      ogImageUrl: `${baseUrl}/og.png`,
      noindex: false,
    },
  }

  return NextResponse.json(manifest)
}
