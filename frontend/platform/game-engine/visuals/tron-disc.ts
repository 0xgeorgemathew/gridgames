// Radius and hitbox multiplier remain the authoritative visual/collision contract.
export const COIN_CONFIG = {
  long: {
    color: 0x00f3ff,
    glowColor: 0x00f3ff,
    darkCore: 0x07181c,
    edgeColor: 0x9cfaff,
    radius: 15.4,
    hitboxMultiplier: 1.4,
    symbol: 'long',
    label: 'LONG',
  },
  short: {
    color: 0xff6b00,
    glowColor: 0xff6b00,
    darkCore: 0x211207,
    edgeColor: 0xffbe83,
    radius: 15.4,
    hitboxMultiplier: 1.4,
    symbol: 'short',
    label: 'SHORT',
  },
} as const
