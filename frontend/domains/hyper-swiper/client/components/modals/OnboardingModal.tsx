'use client'

import { useState, useEffect } from 'react'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}
const GUIDE = [
  {
    title: 'A MARKET.\nA RIVAL.',
    icon: '◎',
    text: 'Trade against one opponent in a live BTC arena. Read the price graph and choose your moment.',
  },
  {
    title: 'SLICE TO\nTAKE A SIDE.',
    icon: '↗',
    text: 'Swipe through a mint LONG coin for a rising price, or a coral SHORT coin for a falling price. The coin type sets your side.',
  },
  {
    title: 'MAKE EVERY\nSWIPE COUNT.',
    icon: '↘',
    text: 'Choose a round length. Find a rival or select one in the lobby. Track your positions and both balances in the arena.',
  },
]

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!isOpen) setStep(0)
  }, [isOpen])
  if (!isOpen) return null
  const page = GUIDE[step]
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-[#080b1b]/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hyper-onboarding-title"
    >
      <section
        className="arena-dialog p-7 w-full max-w-md max-h-[90dvh] overflow-y-auto"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex justify-between mb-8">
          <span className="arena-label">Welcome to the arena</span>
          <span className="arena-label">0{step + 1} / 03</span>
        </div>
        <div
          className="hyper-result__seal"
          style={{ color: 'var(--arena-accent)' }}
          aria-hidden="true"
        >
          {page.icon}
        </div>
        <h2 className="arena-display text-4xl whitespace-pre-line" id="hyper-onboarding-title">
          {page.title}
        </h2>
        <p className="arena-meta mt-5 leading-relaxed min-h-20">{page.text}</p>
        <div className="flex gap-2 my-6" aria-hidden="true">
          {GUIDE.map((_, index) => (
            <div
              key={index}
              className="h-1 flex-1 rounded-full"
              style={{ background: index === step ? 'var(--arena-accent)' : 'var(--arena-line)' }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            className="arena-button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
          >
            {step > 0 ? 'PREVIOUS' : 'SKIP GUIDE'}
          </button>
          <button
            className="arena-button arena-button--primary"
            onClick={() => (step < 2 ? setStep(step + 1) : onClose())}
          >
            {step === 2 ? 'ENTER ARENA' : 'NEXT ↗'}
          </button>
        </div>
      </section>
    </div>
  )
}
