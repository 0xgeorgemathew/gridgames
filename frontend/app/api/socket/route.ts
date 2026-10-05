export async function GET() {
  return Response.json({ transport: 'native-websocket', endpoint: '/api/socket' }, { status: 426 })
}
