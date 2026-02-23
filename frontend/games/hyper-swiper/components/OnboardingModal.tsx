'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ActionButton } from '@/components/ui/ActionButton'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(1)

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1)
    }
  }, [isOpen])

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
    <AnimatePresence>
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
            className="relative w-full max-w-md bg-tron-black border border-tron-cyan/40 p-6 md:p-8 overflow-hidden rounded-sm"
            style={{
              boxShadow: '0 0 30px rgba(0,243,255,0.1), inset 0 0 20px rgba(0,243,255,0.05)',
            }}
          >
            {/* Background elements */}
            <div className="absolute inset-0 tron-grid opacity-10 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-tron-cyan to-transparent opacity-80" />

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-6">
              <h2 className="font-[family-name:var(--font-orbitron)] text-xl text-tron-cyan tracking-[0.2em] drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
                SYSTEM INITIALIZATION
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
                    <div className="text-4xl mb-2">⚡️</div>
                    <h3 className="font-[family-name:var(--font-orbitron)] text-lg text-white tracking-widest">
                      THE ULTIMATE PVP PERP GAME
                    </h3>
                    <p className="text-tron-cyan/70 text-sm leading-relaxed">
                      Welcome to Hyper Swiper. Test your trading intuition against opponents in
                      real-time, high-stakes matches.
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
                    <div className="text-4xl mb-2">↕️</div>
                    <h3 className="font-[family-name:var(--font-orbitron)] text-lg text-white tracking-widest">
                      SWIPE TO TRADE
                    </h3>
                    <p className="text-tron-cyan/70 text-sm leading-relaxed">
                      Swipe <strong className="text-green-400 font-bold">UP to LONG</strong> or{' '}
                      <strong className="text-red-400 font-bold">DOWN to SHORT</strong>. Defend your
                      margin and drain your opponent&apos;s health before time runs out.
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
                    <div className="text-4xl mb-2">🎮</div>
                    <h3 className="font-[family-name:var(--font-orbitron)] text-lg text-white tracking-widest">
                      CONNECT & CONQUER
                    </h3>
                    <p className="text-tron-cyan/70 text-sm leading-relaxed">
                      Connect your wallet, find a match in the lobby, and prepare for combat on the
                      Grid.
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
                        ? 'w-8 bg-tron-cyan shadow-[0_0_8px_var(--color-tron-cyan)]'
                        : 'w-2 bg-tron-cyan/20'
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between w-full gap-4">
                {step > 1 ? (
                  <button
                    onClick={prevStep}
                    className="flex-1 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/60 hover:text-tron-cyan transition-colors"
                  >
                    PREVIOUS
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/40 hover:text-tron-cyan/80 transition-colors"
                  >
                    SKIP PROTOCOL
                  </button>
                )}

                <div className="flex-1">
                  <ActionButton onClick={nextStep} color="cyan">
                    {step === 3 ? 'ENTER GRID' : 'NEXT'}
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
