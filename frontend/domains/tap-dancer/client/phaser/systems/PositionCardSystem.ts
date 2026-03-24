import { Scene } from 'phaser'
import { SharedPositionCardSystem } from '@/domains/match/client/phaser/positions/PositionCardSystem'
import type {
  PositionStoreAdapter,
  SharedPositionStoreState,
} from '@/domains/match/client/phaser/positions/types'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'

export class PositionCardSystem extends SharedPositionCardSystem {
  constructor(scene: Scene) {
    const store: PositionStoreAdapter = {
      subscribe: (listener) =>
        useTradingStore.subscribe((state) =>
          listener(state as unknown as SharedPositionStoreState)
        ),
      getState: () => useTradingStore.getState() as unknown as SharedPositionStoreState,
      requestClose: (positionId) => {
        window.phaserEvents?.emit('close_position', { positionId })
      },
    }

    super(scene, store)
  }
}
