'use client'

import { X } from 'lucide-react'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#080b1b]/90"
      onClick={onClose}
    >
      <section
        className="arena-dialog p-6 w-full max-w-md max-h-[85dvh] overflow-y-auto"
        style={{ touchAction: 'pan-y' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hyper-help-title"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="arena-label mb-3">Field guide / Hyper Swiper</p>
            <h2 className="arena-display text-4xl" id="hyper-help-title">
              CUT YOUR
              <br />
              POSITION.
            </h2>
          </div>
          <button className="arena-icon-button shrink-0" onClick={onClose} aria-label="Close guide">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5 text-sm leading-relaxed">
          <p className="arena-meta">
            Read the live BTC graph. Swipe through a coin to open its position. The coin type
            selects LONG or SHORT.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="arena-panel p-4">
              <b style={{ color: 'var(--arena-long)' }}>↗ LONG</b>
              <p className="arena-meta mt-2">Mint coins. A position for a rising price.</p>
            </div>
            <div className="arena-panel p-4">
              <b style={{ color: 'var(--arena-short)' }}>↘ SHORT</b>
              <p className="arena-meta mt-2">Coral coins. A position for a falling price.</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-1">Your trading balance</h3>
            <p className="arena-meta">
              Positions use {CFG.FIXED_LEVERAGE}× leverage. Track your open positions, your balance,
              and your rival’s balance during the round.
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-1">Position controls</h3>
            <p className="arena-meta">
              The position cards show your entries, direction, and P&amp;L. Use their close control
              to close a position.
            </p>
          </div>
        </div>
        <button className="arena-button arena-button--primary w-full mt-6" onClick={onClose}>
          GOT IT ↗
        </button>
      </section>
    </div>
  )
}
