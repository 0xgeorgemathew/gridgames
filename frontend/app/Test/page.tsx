import React from 'react'
import type { Metadata } from 'next'
import { TestGridBackground } from '@/components/TestGridBackground'

export const metadata: Metadata = {
  title: 'Grid Test | Grid Games',
  description: 'Internal grid background test page for Grid Games.',
}

export default function TestPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#020205] text-white flex flex-col items-center justify-center font-mono">
      {/* The new lightweight grid */}
      <TestGridBackground />
    </div>
  )
}
