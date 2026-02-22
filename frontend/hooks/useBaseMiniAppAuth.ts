import { useEffect, useState, useCallback } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount, useConnect } from 'wagmi'
import type { Context } from '@farcaster/miniapp-core'

// Module-level caches survive component remounts (Privy re-initialization)
let cachedIsInMiniApp: boolean | null = null
let cachedContextUser: Context.UserContext | null = null
let hasAttemptedQuickAuth = false
let hasAttemptedWagmiConnect = false

export function useBaseMiniAppAuth() {
  const [isInMiniApp, setIsInMiniApp] = useState(cachedIsInMiniApp ?? false)
  const [contextUser, setContextUser] = useState<Context.UserContext | null>(cachedContextUser)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  const { address: connectedAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  useEffect(() => {
    if (cachedIsInMiniApp !== null) {
      setIsInMiniApp(cachedIsInMiniApp)
      return
    }
    sdk.isInMiniApp().then((result) => {
      cachedIsInMiniApp = result
      setIsInMiniApp(result)
    })
  }, [])

  // Auto-connect wagmi wallet — guarded to fire only once
  useEffect(() => {
    if (isInMiniApp && !isConnected && !hasAttemptedWagmiConnect) {
      hasAttemptedWagmiConnect = true
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

  // Fetch SDK context — cached at module level to survive remounts
  useEffect(() => {
    if (isInMiniApp && !cachedContextUser) {
      sdk.context.then((ctx) => {
        cachedContextUser = ctx.user
        setContextUser(ctx.user)
      })
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

