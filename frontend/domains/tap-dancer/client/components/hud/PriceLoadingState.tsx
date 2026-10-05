'use client'
import React from 'react'

export const PriceLoadingState = React.memo(function PriceLoadingState() {
  return (
    <div role="status" className="grid gap-3 text-center">
      <span className="arena-label">Market connection</span>
      <strong className="arena-display text-2xl">Setting the stage</strong>
      <p className="arena-meta">Waiting for the live price feed…</p>
    </div>
  )
})
