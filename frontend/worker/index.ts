import app from '@tanstack/react-start/server-entry'
import { env } from 'cloudflare:workers'
export { Multiplayer } from './multiplayer'
export { Lobby } from './lobby'
export { QuoteGate } from './quote-gate'
export { GameRoom } from './game-room'

export default {
  async fetch(
    request: Request,
    bindings: Cloudflare.Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/socket') {
      return env.LOBBY.get(env.LOBBY.idFromName('global-v1')).fetch(request)
    }
    const room = /^\/api\/socket\/room\/([0-9a-f-]{36})$/.exec(url.pathname)
    if (room) return env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(room[1])).fetch(request)
    return app.fetch(request)
  },
}
