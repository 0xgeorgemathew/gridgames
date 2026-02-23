import { DEFAULT_BTC_PRICE } from '@/lib/formatPrice'
import type { PriceBroadcastData } from './types'

/**
 * PriceFeedManager - Real-time Binance WebSocket price feed.
 *
 * Manages WebSocket connection to Binance for live BTC prices.
 * Supports auto-reconnection and throttled broadcasts to clients.
 */
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

  // Price broadcast data for clients
  private lastBroadcastTime = 0
  private readonly BROADCAST_THROTTLE_MS = 100 // 10 updates/sec for HFT-style reactivity

  connect(symbol: string = 'btcusdt'): void {
    // Exit if shutdown
    if (this.isShutdown) return

    this.symbol = symbol

    // Clear any pending reconnect timeout
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

      // Initialize firstPrice on first message or recalculate every 1 min (60000 ms)
      if (this.firstPrice === DEFAULT_BTC_PRICE || now - this.firstPriceTimestamp >= 60000) {
        this.firstPrice = price
        this.firstPriceTimestamp = now
      }

      // Update latest price
      this.latestPrice = price
      this.subscribers.forEach((cb) => cb(price))

      // Throttled broadcast to clients (100ms)
      if (this.broadcastCallback && now - this.lastBroadcastTime >= this.BROADCAST_THROTTLE_MS) {
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

    this.ws.onerror = (error) => {
      if (this.isShutdown) return
      // console.error('[PriceFeed] Server WebSocket error:', error)
    }

    this.ws.onclose = () => {
      // Exit if shutdown
      if (this.isShutdown) return

      // Auto-reconnect after 5s
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isShutdown) {
          this.connect(this.symbol)
        }
      }, 5000)
    }
  }

  disconnect(): void {
    this.isShutdown = true

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.onclose = null // Prevent reconnect trigger
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }

    // Clear subscribers
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
    // Reset prices to defaults for fresh game session
    this.latestPrice = DEFAULT_BTC_PRICE
    this.firstPrice = DEFAULT_BTC_PRICE
    this.firstPriceTimestamp = 0
    this.lastBroadcastTime = 0
  }

  subscribe(callback: (price: number) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  // Set broadcast callback for Socket.IO price broadcasts to clients
  setBroadcastCallback(callback: (data: PriceBroadcastData) => void): void {
    this.broadcastCallback = callback
  }
}

// Singleton instance
export const priceFeed = new PriceFeedManager()
