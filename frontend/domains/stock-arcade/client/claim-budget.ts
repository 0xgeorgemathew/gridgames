import { CATCH_COST, MATCH_BUDGET, type Bag } from '../shared/types'

/** Covers the interval between a local swipe and the ordered server ledger/claim ack. */
export class ClaimBudget {
  private unacknowledged = new Map<string, number>()

  reserve(dropId: string, bag: Bag) {
    if (this.unacknowledged.has(dropId)) return false
    const cost = bag.catchCost ?? CATCH_COST
    const localCost = [...this.unacknowledged.values()].reduce((sum, amount) => sum + amount, 0)
    if (bag.spent + bag.reservedSpend + localCost + cost > MATCH_BUDGET) return false
    this.unacknowledged.set(dropId, cost)
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
