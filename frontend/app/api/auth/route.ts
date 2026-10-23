import { createClient, Errors } from '@farcaster/quick-auth'

const client = createClient()

export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authorization.split(' ')[1]

  // Use the request's Host header so the domain always matches what the client sees
  // (works for direct access, base.dev/preview iframe, and real Mini App)
  const domain = new URL(request.url).host

  try {
    const payload = await client.verifyJwt({ token, domain })

    return Response.json({
      fid: payload.sub,
    })
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return Response.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.error('[Quick Auth API] Error verifying token:', e)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
