import { DEREZ_MS } from './derez-motion'

export type ContactKind = 'pending' | 'credited' | 'failed' | 'rejected'
export const CONTACT_MS = { pending: DEREZ_MS, credited: 600, failed: 650, rejected: 250 } as const
export interface ContactAnchor {
  dropId: string
  symbol: string
  x: number
  y: number
  rotation: number
  angle: number
  diameter: number
}
/** Only locally initiated claims can generate feedback. Replayed acknowledgements,
 * restored bags and another room's messages never manufacture a contact. */
export class ContactFeedback {
  private round: string | null = null
  private claims = new Map<string, { anchor: ContactAnchor; settled: boolean }>()
  private rejected = new Set<string>()
  reset(round: string | null = null) {
    this.round = round
    this.claims.clear()
    this.rejected.clear()
  }
  begin(round: string, anchor: ContactAnchor) {
    if (round !== this.round || this.claims.has(anchor.dropId)) return false
    this.claims.set(anchor.dropId, { anchor, settled: false })
    return true
  }
  reject(round: string, dropId: string) {
    if (round !== this.round || this.rejected.has(dropId) || this.claims.has(dropId)) return false
    this.rejected.add(dropId)
    return true
  }
  settle(round: string, dropId: string, kind: 'credited' | 'failed') {
    const claim = this.claims.get(dropId)
    if (round !== this.round || !claim || claim.settled) return null
    claim.settled = true
    return { ...claim.anchor, kind }
  }
}
