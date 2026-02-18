import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount } from 'wagmi'
import type { Context } from '@farcaster/miniapp-core'

export type BaseMiniAppUser = Context.UserContext

export function useBaseMiniAppAuth() {
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [contextUser, setContextUser] = useState<Context.UserContext | null>(null)
  const { address: connectedAddress, isConnected } = useAccount()

  useEffect(() => {
    sdk.isInMiniApp().then(setIsInMiniApp)
  }, [])

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
  }
}
