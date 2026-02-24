import { DEFAULT_BTC_PRICE } from '@/platform/utils/price.utils'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import type { PriceBroadcastData } from './events.types'

class PriceFeedManager {
  private ws: WebSocket | null = null
  private latestPrice: number = DEFAULT_BTC_PRICE
  private firstPrice: number = DEFAULT_BTC_PRICE
  private firstPriceTimestamp: number = 0
  private subscribers: Set<(price: number) => void> = new Set()
  private reconnectTimeout: NodeJS.Timeout | null = null
  private symbol: string = 'btcusdt'
  private isShutdown = false
  private broadcastCallback: ((data: PriceBroadcastData) => void) | null = null
  private lastBroadcastTime = 0

  connect(symbol: string = 'btcusdt'): void {
    if (this.isShutdown) return

    this.symbol = symbol

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
    }

    const url = `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      if (this.isShutdown) return
      const raw = JSON.parse(event.data.toString())
      const price = parseFloat(raw.p)
      const now = Date.now()

      if (
        this.firstPrice === DEFAULT_BTC_PRICE ||
        now - this.firstPriceTimestamp >= CFG.PRICE_RESET_INTERVAL_MS
      ) {
        this.firstPrice = price
        this.firstPriceTimestamp = now
      }

      this.latestPrice = price
      this.subscribers.forEach((cb) => cb(price))

      if (
        this.broadcastCallback &&
        now - this.lastBroadcastTime >= CFG.PRICE_BROADCAST_THROTTLE_MS
      ) {
        this.lastBroadcastTime = now
        const change = price - this.firstPrice
        const changePercent = (change / this.firstPrice) * 100

        this.broadcastCallback({
          price,
          change,
          changePercent,
          timestamp: now,
        })
      }
    }

    this.ws.onerror = (_error) => {
      if (this.isShutdown) return
    }

    this.ws.onclose = () => {
      if (this.isShutdown) return

      this.reconnectTimeout = setTimeout(() => {
        if (!this.isShutdown) {
          this.connect(this.symbol)
        }
      }, CFG.PRICE_RECONNECT_DELAY_MS)
    }
  }

  disconnect(): void {
    this.isShutdown = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }

    this.subscribers.clear()
    this.broadcastCallback = null
  }

  getLatestPrice(): number {
    return this.latestPrice
  }

  getFirstPrice(): number {
    return this.firstPrice
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  reset(): void {
    this.isShutdown = false
    this.ws = null
    this.reconnectTimeout = null
    this.latestPrice = DEFAULT_BTC_PRICE
    this.firstPrice = DEFAULT_BTC_PRICE
    this.firstPriceTimestamp = 0
    this.lastBroadcastTime = 0
  }

  subscribe(callback: (price: number) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  setBroadcastCallback(callback: (data: PriceBroadcastData) => void): void {
    this.broadcastCallback = callback
  }
}

export const priceFeed = new PriceFeedManager()
