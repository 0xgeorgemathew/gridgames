import { CATCH_COST, MATCH_BUDGET, type Bag } from '../shared/types'

/** Covers the interval between a local swipe and the ordered server ledger/claim ack. */
export class ClaimBudget {
  private unacknowledged = new Set<string>()

  reserve(dropId: string, bag: Bag) {
    if (this.unacknowledged.has(dropId)) return false
    const localCost = this.unacknowledged.size * CATCH_COST
    if (bag.spent + bag.reservedSpend + localCost + CATCH_COST > MATCH_BUDGET) return false
    this.unacknowledged.add(dropId)
    return true
  }

  acknowledge(dropId: string) {
    // The server publishes its reservation/release before acknowledging the claim.
    this.unacknowledged.delete(dropId)
  }

  reset() {
    this.unacknowledged.clear()
  }
}
