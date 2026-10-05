'use client'

export function PriceLoadingState() {
  return (
    <div className="text-center">
      <div className="hyper-pending-orbit" aria-hidden="true">
        ↗
      </div>
      <h2 className="text-xl font-bold mt-6">Syncing the market.</h2>
      <p className="arena-meta mt-2">Waiting for the live price feed.</p>
    </div>
  )
}
