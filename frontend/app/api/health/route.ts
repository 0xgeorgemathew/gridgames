export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    framework: 'tanstack-start',
    environment: 'pivot',
  })
}
