import React from 'react'
import { TestGridBackground } from '@/components/TestGridBackground'

export default function TestPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#020205] text-white flex flex-col items-center justify-center font-mono">
      {/* The new lightweight grid */}
      <TestGridBackground />

      {/* Example UI to show how it looks behind content */}
      <div className="relative z-20 flex flex-col items-center max-w-md p-8 border border-cyan-500/30 bg-black/50 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(0,217,255,0.1)]">
        <h1 className="text-3xl font-bold mb-4 tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
          GRID TEST
        </h1>
        <p className="text-center text-cyan-100/70 text-sm mb-6">
          This is a pure CSS perspective grid. It is extremely lightweight, runs off the GPU without JS overhead, and features straight lines instead of bending tubes.
        </p>
        <button className="px-6 py-2 bg-transparent border border-cyan-400 text-cyan-400 font-bold uppercase tracking-wider rounded hover:bg-cyan-400/10 transition-colors">
          Example Button
        </button>
      </div>
    </div>
  )
}
