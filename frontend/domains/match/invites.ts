import type { InviteCreatedPayload } from './events'

export type InviteGameSlug = 'stock-arcade' | 'hyper-swiper' | 'tap-dancer'

export function inviteSearch(search: Record<string, unknown>): { invite?: string } {
  if (search.invite === undefined) return {}
  // Keep malformed links in the invite flow so they get an explicit error.
  return { invite: typeof search.invite === 'string' ? search.invite : '' }
}

export function isInviteId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
  )
}

export function buildInviteUrl(
  origin: string,
  invite: Pick<InviteCreatedPayload, 'inviteId' | 'gameSlug'>
): string {
  if (
    !isInviteId(invite.inviteId) ||
    !['stock-arcade', 'hyper-swiper', 'tap-dancer'].includes(invite.gameSlug)
  )
    throw new Error('Invalid invite')
  const url = new URL(`/${invite.gameSlug}`, origin)
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid invite origin')
  url.searchParams.set('invite', invite.inviteId)
  return url.toString()
}
