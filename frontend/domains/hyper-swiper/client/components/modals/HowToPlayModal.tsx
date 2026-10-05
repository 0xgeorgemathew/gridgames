'use client'

import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel-vibrant rounded-2xl p-6 max-w-md w-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-tron-cyan">How to Play</h2>
                <button
                  onClick={onClose}
                  aria-label="Close instructions"
                  className="p-1 hover:bg-tron-cyan/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-tron-cyan" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-white/80 leading-relaxed">
                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">SHARED ENERGY DISCS</h3>
                  <p>
                    Swipe cyan ↑ discs to go long, or orange ↓ discs to go short. Both players see
                    the same discs: the first valid slice opens the position. Discs expire after 5
                    seconds.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">CLOSE ON A FAVORABLE MOVE</h3>
                  <p>
                    A long can close above its entry price; a short can close below it. Tap the lit
                    close control when the position becomes favorable.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">SIMULATED SCORE</h3>
                  <p>
                    Each player starts with $10 in game balance. Opening deducts nothing. A correct
                    close transfers up to $1 from your opponent. Open positions expire at round end
                    with no score change.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">POSITION CAPACITY</h3>
                  <p>
                    Your balances and both players’ open positions determine available slots. At
                    FULL, close a favorable position or wait for a slot. Finish with the higher
                    balance, or reduce your opponent to zero.
                  </p>
                </div>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
