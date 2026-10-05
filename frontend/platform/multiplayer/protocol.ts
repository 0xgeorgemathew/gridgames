export interface EventFrame {
  event: string
  args: unknown[]
}
export const MAX_FRAME_BYTES = 65536
const reserved = new Set([
  'connect',
  'disconnect',
  'connect_error',
  'server_restart',
  'transport_handoff',
])

export function parseFrame(value: unknown, fromClient = false): EventFrame | null {
  if (
    typeof value !== 'string' ||
    value.length > MAX_FRAME_BYTES ||
    new TextEncoder().encode(value).byteLength > MAX_FRAME_BYTES
  )
    return null
  try {
    const frame = JSON.parse(value)
    if (
      !frame ||
      typeof frame !== 'object' ||
      typeof frame.event !== 'string' ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(frame.event) ||
      !Array.isArray(frame.args) ||
      frame.args.length > 4 ||
      (fromClient && reserved.has(frame.event))
    )
      return null
    return { event: frame.event, args: frame.args }
  } catch {
    return null
  }
}

// Event payloads remain owned by the game's existing event contracts.
export type EventListener = (...args: any[]) => unknown
