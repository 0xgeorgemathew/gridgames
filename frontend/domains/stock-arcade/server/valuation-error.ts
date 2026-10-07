/** Known scoring outcomes, distinct from infrastructure or pool-read failures. */
export class ValuationError extends Error {
  constructor(readonly reason: 'tie' | 'empty_bags') {
    super(reason === 'tie' ? 'Equal bag values: settlement deferred' : 'No valued acquisitions')
    this.name = 'ValuationError'
  }
}
