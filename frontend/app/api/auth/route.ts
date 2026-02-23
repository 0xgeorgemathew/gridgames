import { createClient, Errors } from '@farcaster/quick-auth'
import { NextRequest, NextResponse } from 'next/server'

const client = createClient()

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authorization.split(' ')[1]

  // Use the request's Host header so the domain always matches what the client sees
  // (works for direct access, base.dev/preview iframe, and real Mini App)
  const domain =
    request.headers.get('host') || process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3000'

  try {
    const payload = await client.verifyJwt({ token, domain })

    return NextResponse.json({
      fid: payload.sub,
    })
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.error('[Quick Auth API] Error verifying token:', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
