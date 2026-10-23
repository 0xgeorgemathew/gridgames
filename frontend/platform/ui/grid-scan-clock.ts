/** A scan starts at its cached frame, independent of page uptime. Hidden time
 * never advances the sweep; sampling/resizing alone does not restart it. */
export function createGridScanClock() {
  let elapsed = 0
  let previous: number | null = null
  return {
    sample(now: number, running: boolean) {
      if (!running) {
        previous = null
        return 0
      }
      if (previous !== null) elapsed += Math.max(0, now - previous) / 1000
      previous = now
      return elapsed
    },
    pause() {
      previous = null
    },
  }
}
