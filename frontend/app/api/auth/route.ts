import { createClient, Errors } from '@farcaster/quick-auth'
import { NextRequest, NextResponse } from 'next/server'

// Use RAILWAY_PUBLIC_DOMAIN if available, otherwise fallback to localhost for dev
const domain = process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3000'
const client = createClient()

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authorization.split(' ')[1]

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
