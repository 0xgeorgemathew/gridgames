import { useEffect, useState, useCallback, useRef } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount, useConnect } from 'wagmi'
import type { Context } from '@farcaster/miniapp-core'

export function useBaseMiniAppAuth() {
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [contextUser, setContextUser] = useState<Context.UserContext | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  const { address: connectedAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const hasAttemptedAuth = useRef(false)

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
    if (isAuthenticating || isAuthenticated) return

    try {
      setIsAuthenticating(true)
      console.log('[QuickAuth] Requesting token...')
      const { token } = await sdk.quickAuth.getToken()
      
      console.log('[QuickAuth] Token received, verifying with backend...')
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      
      const response = await fetch('/api/auth', {
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

  useEffect(() => {
    if (isInMiniApp) {
      sdk.context.then((ctx) => setContextUser(ctx.user))
      
      // Auto-authenticate once if in mini app
      if (!hasAttemptedAuth.current) {
        hasAttemptedAuth.current = true
        authenticate()
      }
    }
  }, [isInMiniApp, authenticate])

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
