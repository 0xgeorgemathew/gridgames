import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'node:http'
import { setupGameEvents } from './game-events'

// Global singleton for Socket.IO server (attached to custom server)
declare global {
  var _socketIOServer: SocketIOServer | undefined
  var _socketIOCleanup: (() => void) | undefined
}

export const runtime = 'nodejs'

// GET handler - Socket.IO attaches as side-effect via upgrade request
export async function GET(req: NextRequest) {
  // This route exists solely for Socket.IO attachment
  // The actual WebSocket upgrade happens via the custom server in server.ts
  return new Response('Socket.IO server running on custom server', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

// Export for use by custom server
// Returns: io instance, cleanup function, and RoomManager for emergency shutdown
export function initializeSocketIO(httpServer: HTTPServer): {
  io: SocketIOServer
  cleanup: () => void
  emergencyShutdown: () => void
} {
  if (global._socketIOServer) {
    return {
      io: global._socketIOServer,
      cleanup: global._socketIOCleanup || (() => {}),
      emergencyShutdown: () => {},
    }
  }

  // In production, use origin reflection for Mini App iframe compatibility
  // 'true' reflects the request origin, works with credentials: true
  // Wildcard '*' is incompatible with credentials: true per CORS spec
  const isProd = process.env.NODE_ENV === 'production'
  const originConfig: string[] | boolean = isProd
    ? (process.env.ALLOWED_ORIGINS?.split(',') as string[]) ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? ([`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] as string[])
        : true)
    : (process.env.ALLOWED_ORIGINS?.split(',') as string[]) || ['http://localhost:3000']

  // Note: originConfig can be boolean 'true' for origin reflection (Mini App compatible)
  if (isProd && originConfig === true) {
    console.log('[Socket.IO] Using origin reflection for Mini App iframe compatibility')
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: originConfig,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  const { cleanup, emergencyShutdown } = setupGameEvents(io)
  global._socketIOServer = io
  global._socketIOCleanup = cleanup

  return { io, cleanup, emergencyShutdown }
}

// Export cleanup function for graceful shutdown
export function cleanupSocketIO(): void {
  if (global._socketIOCleanup) {
    global._socketIOCleanup()
    global._socketIOCleanup = undefined
  }
  global._socketIOServer = undefined
}
