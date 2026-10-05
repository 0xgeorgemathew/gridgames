import { DurableObject } from 'cloudflare:workers'

/** Retired namespace. Keep existing SQL results. Never start a game or a timer. */
export class Multiplayer extends DurableObject<Cloudflare.Env> {
  async fetch(): Promise<Response> {
    return new Response('Retired multiplayer endpoint', { status: 410 })
  }
}
