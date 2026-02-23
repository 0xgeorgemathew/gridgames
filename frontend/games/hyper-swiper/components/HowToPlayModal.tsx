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
                  className="p-1 hover:bg-tron-cyan/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-tron-cyan" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 text-sm text-tron-white/80">
                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">🎯 Objective</h3>
                  <p>
                    Predict if BTC price will go UP or DOWN in 5 seconds. Correct predictions damage
                    your opponent. Reach $0 opponent value to win!
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">⚡ Slice Coins</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <span className="text-green-400">▲ CALL</span> - Predict price UP
                    </li>
                    <li>
                      <span className="text-red-400">▼ PUT</span> - Predict price DOWN
                    </li>
                    <li>
                      <span className="text-yellow-400">⚡ GAS</span> - Penalty, avoid!
                    </li>
                    <li>
                      <span className="text-purple-400">★ WHALE</span> - Bonus (80% win chance)
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">💰 Scoring</h3>
                  <p>
                    Start with $100. Best of 3 rounds. Win: +$10 (opponent -$10). Lose: -$10. Game
                    over at $0 or first to 2 round wins.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-tron-cyan mb-1">📍 Position Indicator</h3>
                  <p>
                    Watch the bottom indicator for your prediction entry, direction, and outcome (✓
                    win, ✗ lose).
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
