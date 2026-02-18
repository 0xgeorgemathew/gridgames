'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http, toCoinType } from 'viem'
import { base } from 'viem/chains'

// Base Mainnet RPC URL
const BASE_RPC = 'https://mainnet.base.org'

// Create viem client for Base mainnet
const client = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
})

/**
 * Hook to resolve Base Name (x.base.eth) from a wallet address
 * Uses viem's getEnsName with Base chain coin type
 */
export function useBaseName(address: string | undefined) {
  const [name, setName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  const resolveName = useCallback(async () => {
    if (!address) {
      setName(null)
      setHasChecked(true)
      return
    }

    setIsLoading(true)
    setHasChecked(false)

    try {
      // Resolve Base Name using viem's ENS resolution with Base coin type
      const baseName = await client.getEnsName({
        address: address as `0x${string}`,
        coinType: toCoinType(base.id),
      })

      setName(baseName)
    } catch (error) {
      console.error('Error resolving Base Name:', error)
      setName(null)
    } finally {
      setIsLoading(false)
      setHasChecked(true)
    }
  }, [address])

  useEffect(() => {
    resolveName()
  }, [resolveName])

  return { name, isLoading, hasChecked, refresh: resolveName }
}
