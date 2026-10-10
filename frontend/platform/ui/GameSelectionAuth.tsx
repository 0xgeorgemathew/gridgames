import { useNavigate } from '@tanstack/react-router'
import { usePrivy } from '@privy-io/react-auth'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { GameSelectionScreen } from './GameSelectionScreen'

export function GameSelectionAuth() {
  const navigate = useNavigate()
  const { ready, authenticated, login, logout, user } = usePrivy()
  const miniApp = useBaseMiniAppAuth()
  const googleName = (user as { google?: { name?: string } } | null)?.google?.name
  const displayName = miniApp.isInMiniApp
    ? (miniApp.user?.username ??
      (miniApp.user?.fid
        ? `fid:${miniApp.user.fid}`
        : miniApp.walletAddress
          ? 'Grid Runner'
          : null))
    : (googleName ?? (user?.wallet?.address ? 'Grid Runner' : null))

  return (
    <GameSelectionScreen
      authPending={!ready && !miniApp.isInMiniApp}
      authState={miniApp.isInMiniApp || (authenticated && user?.wallet) ? 'ready' : 'login'}
      isInMiniApp={miniApp.isInMiniApp}
      miniAppAuthenticating={miniApp.isAuthenticating}
      displayName={displayName}
      pfpUrl={miniApp.isInMiniApp ? miniApp.user?.pfpUrl : null}
      onLogin={login}
      onLogout={logout}
      onNavigate={(slug) => {
        navigate({
          to:
            slug === 'hyper-swiper'
              ? '/hyper-swiper'
              : slug === 'stock-arcade'
                ? '/stock-arcade'
                : '/tap-dancer',
        })
      }}
    />
  )
}
