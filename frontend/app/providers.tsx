'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { privyConfig } from '@/privy/config'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { MotionProvider } from '@/components/MotionProvider'

// Wagmi config for Base and Base Sepolia with Farcaster Mini App connector
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

export function Providers({ children }: { children: ReactNode }) {
  // Create a new QueryClient instance for each session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  )

  return (
    <MotionProvider>
      <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} config={privyConfig}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </MotionProvider>
  )
}
