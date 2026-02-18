import { NextResponse } from 'next/server'

/**
 * Farcaster Mini App Manifest
 * Required for Base Mini App integration
 *
 * Account association verified at: https://www.base.dev/preview?tab=account
 * Domain: gridgames.space
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://gridgames.space'

  const manifest = {
    accountAssociation: {
      header:
        'eyJmaWQiOjIwMjU3MzksInR5cGUiOiJhdXRoIiwia2V5IjoiMHg3OThmOTgxN2VmYzQzQ0Y2MzQzNDYwMDAyNzc2MWI5NDAyNDJBMTcwIn0',
      payload: 'eyJkb21haW4iOiJncmlkZ2FtZXMuc3BhY2UifQ',
      signature:
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEXa-DhA863fYTfpe8kGP225_XD3zZWIESn6HzyQKKqH2XbP07KWi_1hAJG27TMAPyt71XsKKOIdte92Cp-DoUHGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
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
