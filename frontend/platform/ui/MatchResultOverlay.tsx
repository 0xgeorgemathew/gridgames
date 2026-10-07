'use client'
import type React from 'react'
import { m } from 'framer-motion'
import { cn } from '@/platform/utils/classNames.utils'
/** The existing Tap Dancer results presentation, shared without game-store coupling. */
export function MatchResultOverlay({
  title,
  accent,
  subtitle,
  children,
  onPlayAgain,
  onBack,
}: {
  title: string
  accent: 'cyan' | 'orange'
  subtitle: React.ReactNode
  children: React.ReactNode
  onPlayAgain: () => void
  onBack?: () => void
}) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 overflow-y-auto"
    >
      <m.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="glass-panel-vibrant rounded-2xl p-5 w-full max-w-sm text-center max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
          className="mb-4"
        >
          <h2
            className={cn(
              'font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-[0.15em]',
              accent === 'cyan' ? 'text-tron-cyan' : 'text-tron-orange'
            )}
          >
            {title}
          </h2>
          <div className="text-white/50 mt-1 text-[10px] tracking-[0.2em] flex items-center justify-center gap-1.5">
            {subtitle}
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-4 space-y-2"
        >
          {children}
        </m.div>

        <m.button
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full relative group"
        >
          <m.div
            className="absolute inset-0 rounded-lg"
            style={{ boxShadow: '0 0 40px rgba(0,217,255,0.5)' }}
          />
          <div className="relative py-3 bg-black/40 backdrop-blur-md border border-cyan-400/30 rounded-lg">
            <span className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] font-medium text-tron-cyan">
              PLAY AGAIN
            </span>
          </div>
        </m.button>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 min-h-11 text-[10px] tracking-[0.2em] text-tron-cyan/60 font-[family-name:var(--font-orbitron)]"
          >
            ← BACK TO GAMES
          </button>
        )}
      </m.div>
    </m.div>
  )
}
