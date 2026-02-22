import { useEffect, useState, useCallback } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount, useConnect } from 'wagmi'
import type { Context } from '@farcaster/miniapp-core'

// Module-level flag survives component remounts (React Strict Mode, Privy re-init)
let hasAttemptedQuickAuth = false

export function useBaseMiniAppAuth() {
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [contextUser, setContextUser] = useState<Context.UserContext | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  const { address: connectedAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  useEffect(() => {
    sdk.isInMiniApp().then(setIsInMiniApp)
  }, [])

  // Auto-connect wagmi wallet when in Mini App
  useEffect(() => {
    if (isInMiniApp && !isConnected) {
      const farcasterConnector = connectors.find(c => c.id === 'farcaster')
      if (farcasterConnector) {
        connect({ connector: farcasterConnector })
      }
    }
  }, [isInMiniApp, isConnected, connectors, connect])

  const authenticate = useCallback(async () => {
    if (isAuthenticating || isAuthenticated || hasAttemptedQuickAuth) return

    hasAttemptedQuickAuth = true
    try {
      setIsAuthenticating(true)
      console.log('[QuickAuth] Requesting token...')
      const { token } = await sdk.quickAuth.getToken()
      
      console.log('[QuickAuth] Token received, verifying with backend...')
      
      const response = await sdk.quickAuth.fetch(`${window.location.origin}/api/auth`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error(`Backend verification failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('[QuickAuth] Backend verified token for FID:', data.fid)
      
      setAuthToken(token)
      setIsAuthenticated(true)
    } catch (error) {
      console.error("[QuickAuth] Authentication failed:", error)
      setIsAuthenticated(false)
    } finally {
      setIsAuthenticating(false)
    }
  }, [isAuthenticating, isAuthenticated])

  // Only fetch SDK context on mount — no popups, safe to auto-call.
  // Quick Auth (authenticate) is NOT called automatically because it opens
  // a signIn popup. Call authenticate() explicitly when backend trust is needed.
  useEffect(() => {
    if (isInMiniApp) {
      sdk.context.then((ctx) => setContextUser(ctx.user))
    }
  }, [isInMiniApp])

  return {
    isInMiniApp,
    user: contextUser,
    walletAddress: connectedAddress,
    isConnected,
    authToken,
    isAuthenticated,
    isAuthenticating,
    authenticate
  }
}
