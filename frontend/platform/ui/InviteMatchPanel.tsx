import { useState } from 'react'
import { ActionButton } from './ActionButton'
import { isInviteId } from '@/domains/match/invites'
import type { useInviteMatch } from '@/domains/match/client/use-invite-match'

export function InviteMatchPanel({
  invite,
  authenticated,
  connected,
  onLogin,
  onJoin,
}: {
  invite: ReturnType<typeof useInviteMatch>
  authenticated: boolean
  connected: boolean
  onLogin: () => void
  onJoin?: () => void
}) {
  const [feedback, setFeedback] = useState('')
  const invalid = invite.incoming !== undefined && !isInviteId(invite.incoming)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.link)
      setFeedback('Link copied.')
    } catch {
      setFeedback('Select the link above and copy it to invite your friend.')
    }
  }
  const share = async () => {
    try {
      await navigator.share({ title: 'Play Grid Games with me', url: invite.link })
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') await copy()
    }
  }
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md min-h-[200px]">
      <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em]">
        {invite.state.status === 'waiting' ? 'WAITING FOR YOUR FRIEND' : 'FRIEND INVITE'}
      </p>
      {invite.state.status === 'error' || invalid ? (
        <p role="alert" className="text-center text-xs text-tron-cyan/80 max-w-xs">
          {invalid
            ? 'This invite link is invalid. Ask your friend for a new link.'
            : invite.state.message}
        </p>
      ) : invite.link ? (
        <>
          <input
            aria-label="Invite link"
            readOnly
            value={invite.link}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-sm border border-tron-cyan/40 bg-tron-black/80 px-3 py-3 text-xs text-tron-cyan focus-visible:outline-2 focus-visible:outline-tron-cyan"
          />
          <div className="flex flex-wrap justify-center gap-2">
            <ActionButton
              color="cyan"
              size="sm"
              onClick={() => {
                void copy()
              }}
            >
              COPY LINK
            </ActionButton>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <ActionButton
                color="cyan"
                size="sm"
                onClick={() => {
                  void share()
                }}
              >
                SHARE
              </ActionButton>
            )}
          </div>
          <p className="text-center text-[10px] text-tron-cyan/60 max-w-xs">
            {invite.state.invite!.gameDuration / 60000} min match. Keep this page open. The link
            expires in 10 minutes.
          </p>
        </>
      ) : invite.state.status === 'creating' || invite.state.status === 'joining' ? (
        <p role="status" className="text-xs text-tron-cyan/70">
          {invite.state.status === 'creating' ? 'Creating invite…' : 'Joining your friend…'}
        </p>
      ) : !authenticated ? (
        <>
          <p className="text-center text-xs text-tron-cyan/70">Sign in to play with your friend.</p>
          <ActionButton color="cyan" onClick={onLogin}>
            SIGN IN TO JOIN
          </ActionButton>
        </>
      ) : (
        <>
          <p className="text-center text-xs text-tron-cyan/70">
            Join your friend’s game with their match settings.
          </p>
          <ActionButton color="cyan" disabled={!connected} onClick={onJoin ?? invite.join}>
            {connected ? 'JOIN FRIEND' : 'CONNECTING…'}
          </ActionButton>
        </>
      )}
      <ActionButton color="cyan" size="sm" onClick={invite.cancel}>
        {invite.state.status === 'error' || invalid ? 'BACK TO LOBBY' : 'CANCEL INVITE'}
      </ActionButton>
      {feedback && (
        <p role="status" aria-live="polite" className="text-center text-xs text-tron-cyan/70">
          {feedback}
        </p>
      )}
    </div>
  )
}
