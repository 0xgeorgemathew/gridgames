import React from 'react'
import { TestGridBackground } from '@/platform/ui/TestGridBackground'

export default function TestPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#020205] text-white flex flex-col items-center justify-center font-mono">
      {/* The new lightweight grid */}
      <TestGridBackground />
    </div>
  )
}
