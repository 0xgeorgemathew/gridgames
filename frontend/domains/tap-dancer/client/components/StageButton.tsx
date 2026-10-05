'use client'
import type { ReactNode } from 'react'
export function StageButton({
  children, onClick, disabled = false, isLoading = false,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  color?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled || isLoading} aria-busy={isLoading}
      className="arena-button arena-button--primary w-full">
      {isLoading ? 'Loading…' : children}
    </button>
  )
}
