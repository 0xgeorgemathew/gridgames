/** A continuous server-time presentation, anchored only to monotonic local time.
 * Samples include delivery latency: reconcile them at at most 10% of elapsed time.
 * The unsmoothed estimate is retained for deadline checks; the server owns validity. */
export class PresentationClock {
  private time = 0
  private local = 0
  private sampleTime = 0
  private sampleLocal = 0
  private initialized = false

  reset(serverTime: number, localTime: number) {
    this.time = this.sampleTime = serverTime
    this.local = this.sampleLocal = localTime
    this.initialized = true
  }

  sample(serverTime: number, localTime: number) {
    if (!Number.isFinite(serverTime) || !Number.isFinite(localTime)) return
    if (!this.initialized) return this.reset(serverTime, localTime)
    this.now(localTime)
    this.sampleTime = serverTime
    this.sampleLocal = localTime
  }

  now(localTime: number) {
    const elapsed = Math.max(0, localTime - this.local)
    const predicted = this.time + elapsed
    const error = this.authoritativeNow(localTime) - predicted
    this.time = predicted + Math.max(-elapsed * 0.1, Math.min(elapsed * 0.1, error))
    this.local = Math.max(this.local, localTime)
    return this.time
  }

  authoritativeNow(localTime: number) {
    return this.sampleTime + Math.max(0, localTime - this.sampleLocal)
  }
}
