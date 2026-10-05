import { getPositionOpeningCapacity } from '@/domains/match/position-opening'

interface MatchStatusStripProps {
  playerBalance: number
  opponentBalance: number
  playerOpenPositions: number
  opponentOpenPositions: number
  stakeAmount: number
  controlHint: string
}

export function MatchStatusStrip(props: MatchStatusStripProps) {
  const capacity = getPositionOpeningCapacity(props)
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1 font-mono text-[10px] tracking-wider border-b border-tron-cyan/10">
      <span className="text-white/60">SIMULATED SCORE</span>
      <span className={capacity.canOpen ? 'text-tron-cyan' : 'text-tron-orange'}>
        {capacity.canOpen
          ? `${capacity.remainingOpenSlots} SLOTS READY`
          : 'FULL · CLOSE TO FREE A SLOT'}
      </span>
      <span className="text-white/60 hidden min-[390px]:inline">{props.controlHint}</span>
    </div>
  )
}
