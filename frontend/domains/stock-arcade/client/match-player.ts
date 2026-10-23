/** The completed bag belongs to the match's original player, even when a later
 * transport reconnect creates a new session. A new match captures a new owner. */
export class MatchPlayer {
  private matchId: string | null = null
  private playerId: string | undefined
  remember(matchId: string, playerId: string | undefined) {
    if (!playerId || this.matchId === matchId) return
    this.matchId = matchId
    this.playerId = playerId
  }
  get(matchId: string) {
    return this.matchId === matchId ? this.playerId : undefined
  }
  reset() {
    this.matchId = null
    this.playerId = undefined
  }
}
