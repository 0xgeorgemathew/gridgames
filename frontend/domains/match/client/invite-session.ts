import type { RealtimeSocket } from '@/platform/multiplayer/client'
import type {
  CreateInvitePayload,
  FindMatchPayload,
  InviteCreatedPayload,
  JoinInvitePayload,
} from '../events'
import { isInviteId } from '../invites'

export interface InviteState {
  status: 'idle' | 'creating' | 'waiting' | 'joining' | 'error'
  invite: InviteCreatedPayload | null
  message: string
}

export class InviteSession {
  private state: InviteState = { status: 'idle', invite: null, message: '' }
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private onMatch: (() => void) | undefined
  private requestId: string | null = null
  constructor(
    private socket: RealtimeSocket | null,
    private gameSlug: string
  ) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  attach(onMatch?: () => void): () => void {
    this.onMatch = onMatch
    const handlers = [
      ['invite_created', this.created],
      ['invite_expired', this.expired],
      ['error', this.failed],
      ['disconnect', this.disconnected],
      ['match_found', this.matched],
      ['arcade_state', this.matched],
      ['match_aborted', this.aborted],
    ] as const
    for (const [event, listener] of handlers) this.socket?.on(event, listener)
    return () => {
      for (const [event, listener] of handlers) this.socket?.off(event, listener)
      this.clearTimer()
      this.onMatch = undefined
    }
  }
  create(player: FindMatchPayload): void {
    if (!this.canRequest()) return
    this.request('creating')
    this.socket!.emit('create_invite', {
      ...player,
      gameSlug: this.gameSlug,
      requestId: this.requestId!,
    } satisfies CreateInvitePayload)
  }
  join(inviteId: string, player: Omit<JoinInvitePayload, 'inviteId'>): void {
    if (!this.canRequest()) return
    if (!isInviteId(inviteId)) {
      this.error('This invite link is invalid. Ask your friend for a new link.')
      return
    }
    this.request('joining')
    this.socket!.emit('join_invite', { ...player, gameSlug: this.gameSlug, inviteId })
  }
  cancel(): void {
    if (this.socket?.connected && !this.socket.roomId) this.socket.emit('leave_waiting_pool')
    this.clearTimer()
    this.update({ status: 'idle', invite: null, message: '' })
  }
  private canRequest(): boolean {
    return (
      !!this.socket?.connected &&
      !this.socket.roomId &&
      (this.state.status === 'idle' || this.state.status === 'error')
    )
  }
  private request(status: 'creating' | 'joining'): void {
    this.clearTimer()
    this.requestId = status === 'creating' ? crypto.randomUUID() : null
    this.update({ status, invite: null, message: '' })
    this.timer = setTimeout(() => {
      if (this.socket?.connected && !this.socket.roomId) this.socket.emit('leave_waiting_pool')
      this.error('Invite confirmation timed out. Return to the lobby and try again.')
    }, 30000)
  }
  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
  private update(state: InviteState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }
  private error(message: string): void {
    this.clearTimer()
    this.update({ status: 'error', invite: null, message })
  }
  private created = (raw: unknown) => {
    const invite = raw as Partial<InviteCreatedPayload> | null
    if (
      this.state.status !== 'creating' ||
      invite?.requestId !== this.requestId ||
      !invite ||
      !isInviteId(invite.inviteId) ||
      invite.gameSlug !== this.gameSlug ||
      typeof invite.gameDuration !== 'number' ||
      !Number.isFinite(invite.gameDuration) ||
      invite.gameDuration < 1000 ||
      invite.gameDuration > 3600000 ||
      typeof invite.expiresAt !== 'number' ||
      !Number.isFinite(invite.expiresAt) ||
      invite.expiresAt <= Date.now()
    )
      return
    this.clearTimer()
    this.update({ status: 'waiting', invite: invite as InviteCreatedPayload, message: '' })
  }
  private expired = (raw: unknown) => {
    if (
      (raw as { inviteId?: string } | null)?.inviteId === this.state.invite?.inviteId &&
      this.state.invite
    )
      this.error('Your invite expired. Create a new link to play with your friend.')
  }
  private failed = (raw: unknown) => {
    if (this.state.status === 'idle' || this.state.status === 'error') return
    const error = raw as { message?: unknown; requestId?: unknown } | null
    if (error?.requestId !== undefined && error.requestId !== this.requestId) return
    this.error(
      typeof error?.message === 'string' ? error.message : 'Invite unavailable. Try a new link.'
    )
  }
  private disconnected = () => {
    if (this.state.status !== 'idle')
      this.error('Connection lost. Reconnect and create or open a new invite.')
  }
  private aborted = (raw: unknown) => {
    const match = raw as { matchId?: string } | null
    if (
      this.socket?.roomId &&
      match?.matchId === this.socket.roomId &&
      this.state.status !== 'idle'
    )
      this.error(
        'Your friend could not join the match. Return to the lobby and create a new invite.'
      )
  }
  private matched = (raw: unknown) => {
    const match = raw as { roomId?: string; matchId?: string } | null
    if (
      !this.socket?.roomId ||
      (match?.roomId ?? match?.matchId) !== this.socket.roomId ||
      this.state.status === 'idle' ||
      this.state.status === 'error'
    )
      return
    this.clearTimer()
    this.update({ status: 'idle', invite: null, message: '' })
    this.onMatch?.()
  }
}
