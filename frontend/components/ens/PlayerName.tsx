'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface PlayerNameProps {
  username?: string | null
  address?: string
  showFull?: boolean
  className?: string
  enableGlow?: boolean
}

/**
 * Component to display a player's name with TRON holographic effect.
 * Shows the username as-is (could be Base Name, Privy name, or Farcaster username).
 * Fallback to truncated address if no username.
 *
 * Special styling: .base.eth suffix rendered in cyan with distinct glow.
 */
export function PlayerName({
  username,
  address,
  showFull = false,
  className = '',
  enableGlow = true,
}: PlayerNameProps) {
  // Parse username to detect .base.eth suffix for special styling
  const parsedName = useMemo(() => {
    if (!username) return null

    const baseEthMatch = username.match(/^(.+)(\.base\.eth)$/i)
    if (baseEthMatch) {
      return {
        prefix: baseEthMatch[1],
        suffix: baseEthMatch[2].toLowerCase(), // Normalize to lowercase
        isBaseName: true,
      }
    }

    return { prefix: username, suffix: null, isBaseName: false }
  }, [username])

  if (parsedName) {
    const displayName = showFull ? username : username

    // Base Name with .base.eth styling
    if (parsedName.isBaseName && parsedName.suffix) {
      return enableGlow ? (
        <motion.span
          className="font-[family-name:var(--font-orbitron)] inline-flex items-baseline"
          animate={{
            textShadow: [
              '0 0 10px rgba(0, 243, 255, 0.3)',
              '0 0 20px rgba(0, 243, 255, 0.5)',
              '0 0 10px rgba(0, 243, 255, 0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className={className || 'text-white'}
            animate={{
              textShadow: [
                '0 0 10px rgba(0, 243, 255, 0.3)',
                '0 0 20px rgba(0, 243, 255, 0.5)',
                '0 0 10px rgba(0, 243, 255, 0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {parsedName.prefix}
          </motion.span>
          <motion.span
            className="text-cyan-400"
            animate={{
              textShadow: [
                '0 0 8px rgba(0, 243, 255, 0.6)',
                '0 0 16px rgba(0, 243, 255, 0.9)',
                '0 0 8px rgba(0, 243, 255, 0.6)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {parsedName.suffix}
          </motion.span>
        </motion.span>
      ) : (
        <span className={`font-[family-name:var(--font-orbitron)] inline-flex items-baseline ${className || 'text-white'}`}>
          <span>{parsedName.prefix}</span>
          <span className="text-cyan-400">{parsedName.suffix}</span>
        </span>
      )
    }

    // Non-Base Name (regular display)
    return enableGlow ? (
      <motion.span
        className="font-[family-name:var(--font-orbitron)] inline-block"
        animate={{
          textShadow: [
            '0 0 10px rgba(0, 243, 255, 0.3)',
            '0 0 20px rgba(0, 243, 255, 0.6)',
            '0 0 10px rgba(0, 243, 255, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.span
          className={className || 'text-white'}
          animate={{
            textShadow: [
              '0 0 10px rgba(0, 243, 255, 0.3)',
              '0 0 20px rgba(0, 243, 255, 0.6)',
              '0 0 10px rgba(0, 243, 255, 0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {displayName}
        </motion.span>
      </motion.span>
    ) : (
      <span className={`font-[family-name:var(--font-orbitron)] ${className || 'text-white'}`}>
        {displayName}
      </span>
    )
  }

  if (address) {
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`
    return (
      <span className={`font-mono ${className}`} title={address}>
        {truncated}
      </span>
    )
  }

  return <span className={`text-gray-500 ${className}`}>Unknown</span>
}
