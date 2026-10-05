export interface RoomPlayer {
  id: string
  name: string
  walletAddress?: string
  sceneWidth: number
  sceneHeight: number
  ticket: string
  returnToken: string
}
export interface RoomProvision {
  roomId: string
  gameSlug: string
  gameDuration: number
  players: [RoomPlayer, RoomPlayer]
}
export function upgradeDenied(request: Request, allowedOrigins: string): Response | null {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
    return new Response('WebSocket upgrade required', { status: 426 })
  const origin = request.headers.get('Origin')
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    !allowedOrigins.split(',').includes(origin)
  )
    return new Response('Origin denied', { status: 403 })
  return null
}
export function send(ws: WebSocket, event: string, ...args: unknown[]): void {
  if (ws.readyState === 1) ws.send(JSON.stringify({ event, args }))
}
export function handoff(ws: WebSocket, path: string): void {
  send(ws, 'transport_handoff', { path })
}
