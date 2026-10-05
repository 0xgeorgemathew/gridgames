'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { StageButton as ActionButton } from '../StageButton'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(1)

  const nextStep = () => {
    if (step < 3) {
      setStep((prev) => prev + 1)
    } else {
      onClose()
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1)
    }
  }

  return (
    <AnimatePresence onExitComplete={() => setStep(1)}>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <m.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="arena-dialog relative w-full max-w-md p-6 md:p-8 overflow-hidden"
          >
            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-6">
              <h2 className="font-mono text-xl text-[var(--arena-accent)] tracking-[0.2em] drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
                YOUR FIRST ROUND
              </h2>
            </div>

            {/* Content Container */}
            <div className="relative z-10 min-h-[180px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <m.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center text-center gap-4"
                  >
                    <div className="text-4xl mb-2">↗</div>
                    <h3 className="font-mono text-lg text-white tracking-widest">
                      READ THE MARKET
                    </h3>
                    <p className="text-[var(--arena-accent)]/70 text-sm leading-relaxed">
                      Welcome to Tap Dancer. Test your trading instincts in live head-to-head rounds.
                      Pick a direction, then tap to open a position.
                    </p>
                  </m.div>
                )}

                {step === 2 && (
                  <m.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center text-center gap-4"
                  >
                    <div className="flex gap-4 text-4xl mb-2">
                      <span className="text-[#d9f56e]">▲</span>
                      <span className="text-[#ff68bc]">▼</span>
                    </div>
                    <h3 className="font-mono text-lg text-white tracking-widest">
                      TAP TO TRADE
                    </h3>
                    <p className="text-[var(--arena-accent)]/70 text-sm leading-relaxed">
                      Tap <strong className="text-[#d9f56e] font-bold">LONG</strong> (profit when
                      price rises) or <strong className="text-[#ff68bc] font-bold">SHORT</strong>{' '}
                      (profit when price falls). Close positions before they liquidate!
                    </p>
                  </m.div>
                )}

                {step === 3 && (
                  <m.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center text-center gap-4"
                  >
                    <div className="text-4xl mb-2">01</div>
                    <h3 className="font-mono text-lg text-white tracking-widest">
                      OUTPERFORM YOUR OPPONENT
                    </h3>
                    <p className="text-[var(--arena-accent)]/70 text-sm leading-relaxed">
                      Your goal: accumulate more profit than your rival. The chart tracks the market.
                      Watch your open positions and close at the right moment.
                    </p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation / Footer */}
            <div className="relative z-10 mt-8 flex flex-col gap-4">
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3].map((dot) => (
                  <div
                    key={`step-${dot}`}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      dot === step
                        ? 'w-8 bg-[var(--arena-accent)] shadow-[0_0_8px_var(--color-tron-cyan)]'
                        : 'w-2 bg-[var(--arena-accent)]/20'
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between w-full gap-4">
                {step > 1 ? (
                  <button
                    onClick={prevStep}
                    className="flex-1 py-2 font-mono text-xs tracking-[0.2em] text-[var(--arena-accent)]/60 hover:text-[var(--arena-accent)] transition-colors"
                  >
                    PREVIOUS
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 font-mono text-xs tracking-[0.2em] text-[var(--arena-accent)]/40 hover:text-[var(--arena-accent)]/80 transition-colors"
                  >
                    SKIP
                  </button>
                )}

                <div className="flex-1">
                  <ActionButton onClick={nextStep} color="cyan">
                    {step === 3 ? 'LET’S PLAY' : 'NEXT'}
                  </ActionButton>
                </div>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
