import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function normalizeBaseUrl(value: string | undefined): string {
  const raw = (value || 'https://gridgames.space').trim()
  return raw.replace(/^["']|["']$/g, '').replace(/\/+$/, '')
}

function cleanToken(value: string | undefined): string {
  return (value || '').trim().replace(/^["']|["']$/g, '')
}

export async function GET() {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_URL)
  const appName = 'Grid Games'
  const appDescription = 'Real-time multiplayer games with blockchain settlement'

  const manifest = {
    accountAssociation: {
      header: cleanToken(process.env.FC_HEADER),
      payload: cleanToken(process.env.FC_PAYLOAD),
      signature: cleanToken(process.env.FC_SIGNATURE),
    },
    // Newer schema used by Base docs
    miniapp: {
      version: '1',
      name: appName,
      homeUrl: baseUrl,
      iconUrl: `${baseUrl}/icon.png`,
      imageUrl: `${baseUrl}/og.png`,
      buttonTitle: 'Play Now',
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#000000',
      webhookUrl: `${baseUrl}/api/webhook`,
      subtitle: 'Onchain PvP',
      description: appDescription,
      primaryCategory: 'games',
      tags: ['games', 'multiplayer', 'base'],
      screenshotUrls: [
        `${baseUrl}/screenshots/game-1.png`,
        `${baseUrl}/screenshots/game-2.png`,
        `${baseUrl}/screenshots/game-3.png`,
      ],
    },
    // Backward-compatible schema used by some preview tooling
    frame: {
      version: '1',
      name: appName,
      homeUrl: baseUrl,
      iconUrl: `${baseUrl}/icon.png`,
      imageUrl: `${baseUrl}/og.png`,
      buttonTitle: 'Play Now',
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#000000',
      webhookUrl: `${baseUrl}/api/webhook`,
    },
  }

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
