'use client'

import React from 'react'
import Image from 'next/image'
import { m } from 'framer-motion'
import { PlayerName } from '@/platform/ui/PlayerName'
import { cn } from '@/platform/utils/classNames.utils'

interface UserProfileBadgeProps {
  displayName: string | null
  pfpUrl?: string | null
  className?: string
  compact?: boolean
}

/**
 * UserProfileBadge - Unified profile display component.
 *
 * Layout: [Name] [Profile Picture in Circle]
 * Position: Top right corner on mobile
 *
 * Handles users with or without profile pictures gracefully.
 * Works for both Base Mini App users (with pfp) and Privy users (without pfp).
 */
export const UserProfileBadge = React.memo(function UserProfileBadge({
  displayName,
  pfpUrl,
  className,
  compact = false,
}: UserProfileBadgeProps) {
  if (!displayName) return null

  const sizeClasses = compact
    ? {
        container: 'gap-2',
        name: 'text-xs tracking-[0.08em]',
        avatar: 'w-7 h-7 text-[6px]',
      }
    : {
        container: 'gap-2.5',
        name: 'text-sm tracking-[0.1em]',
        avatar: 'w-9 h-9 text-[8px]',
      }

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-center flex-row-reverse', // PFP on right, name on left
        sizeClasses.container,
        className
      )}
    >
      {/* Profile Picture - Circle */}
      <div className="relative shrink-0">
        {pfpUrl ? (
          <>
            {/* Glow ring */}
            <div className="absolute -inset-0.5 rounded-full bg-tron-cyan/30 blur-[3px]" />
            {/* Animated border */}
            <m.div
              className="absolute -inset-[2px] rounded-full border border-tron-cyan/60"
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Image
              src={pfpUrl}
              alt=""
              width={compact ? 28 : 36}
              height={compact ? 28 : 36}
              unoptimized
              className={cn(
                'relative rounded-full border-2 border-tron-cyan/80 object-cover',
                sizeClasses.avatar
              )}
            />
          </>
        ) : (
          /* Fallback avatar for users without profile picture */
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-full bg-tron-cyan/20 blur-[2px]" />
            <m.div
              className="absolute -inset-[2px] rounded-full border border-tron-cyan/50"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div
              className={cn(
                'relative rounded-full border-2 border-tron-cyan/60 bg-gradient-to-br from-tron-cyan/20 to-tron-black/80 flex items-center justify-center overflow-hidden',
                sizeClasses.avatar
              )}
            >
              {/* Stylized user icon using CSS - cleaner design */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={cn('w-[60%] h-[60%] text-tron-cyan/80')}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Player Name */}
      <div className="flex items-center min-w-0 max-w-[140px] sm:max-w-[180px] overflow-hidden">
        <PlayerName
          username={displayName}
          className={cn(
            'font-[family-name:var(--font-orbitron)] text-tron-cyan drop-shadow-[0_0_8px_var(--color-tron-cyan)] block truncate',
            sizeClasses.name
          )}
          enableGlow={true}
        />
      </div>
    </m.div>
  )
})
