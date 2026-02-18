import { NextRequest, NextResponse } from 'next/server'
import {
  parseWebhookEvent,
  createVerifyAppKeyWithHub,
  verifyAppKeyWithNeynar,
  type ParseWebhookEventResult,
} from '@farcaster/miniapp-node'

/**
 * In-memory storage for notification tokens
 * TODO: Replace with Redis/database for production persistence
 */
const notificationTokens = new Map<string, { token: string; url: string; timestamp: number }>()

/**
 * Create a verifier that uses Neynar if API key is available,
 * otherwise falls back to the public Farcaster Hub
 */
function createVerifier() {
  const neynarApiKey = process.env.NEYNAR_API_KEY

  if (neynarApiKey) {
    return verifyAppKeyWithNeynar
  }

  // Fallback to public hub (no API key required)
  return createVerifyAppKeyWithHub('https://hub.freefarcaster.com')
}

/**
 * Farcaster Mini App Webhook Handler
 *
 * Handles signed events from Farcaster clients:
 * - miniapp_added: User added the app (includes notification details)
 * - miniapp_removed: User removed the app
 * - notifications_enabled: User enabled notifications
 * - notifications_disabled: User disabled notifications
 *
 * All requests are verified using JSON Farcaster Signatures (JFS)
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const data = JSON.parse(rawBody)

    // Verify and parse the webhook event
    const verifier = createVerifier()
    const result: ParseWebhookEventResult = await parseWebhookEvent(data, verifier)

    const { event } = result

    // Extract notification details if present
    const notificationDetails =
      'notificationDetails' in event ? event.notificationDetails : undefined

    switch (event.event) {
      case 'miniapp_added': {
        // User added the mini app - store notification token if provided
        console.log('Mini app added by FID:', result.fid)

        if (notificationDetails) {
          notificationTokens.set(String(result.fid), {
            token: notificationDetails.token,
            url: notificationDetails.url,
            timestamp: Date.now(),
          })
          console.log('Stored notification token for FID:', result.fid)
        }
        break
      }

      case 'miniapp_removed': {
        // User removed the mini app - clean up token
        console.log('Mini app removed by FID:', result.fid)
        notificationTokens.delete(String(result.fid))
        break
      }

      case 'notifications_enabled': {
        // User enabled notifications
        console.log('Notifications enabled for FID:', result.fid)

        if (notificationDetails) {
          notificationTokens.set(String(result.fid), {
            token: notificationDetails.token,
            url: notificationDetails.url,
            timestamp: Date.now(),
          })
        }
        break
      }

      case 'notifications_disabled': {
        // User disabled notifications - remove token
        console.log('Notifications disabled for FID:', result.fid)
        notificationTokens.delete(String(result.fid))
        break
      }

      default:
        console.log('Unknown webhook event:', event)
    }

    // Return 200 OK to prevent retries
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook verification error:', error)

    // Return 200 even on error to prevent Farcaster retries
    // Log the error for debugging but don't expose to client
    return NextResponse.json({ success: false }, { status: 200 })
  }
}

/**
 * Export notification tokens for use in push notification logic
 * In production, this would be replaced with database queries
 */
export function getNotificationToken(fid: number): { token: string; url: string } | null {
  const entry = notificationTokens.get(String(fid))
  if (!entry) return null
  return { token: entry.token, url: entry.url }
}

export function getAllNotificationTokens(): Array<{ fid: string; token: string; url: string }> {
  return Array.from(notificationTokens.entries()).map(([fid, { token, url }]) => ({
    fid,
    token,
    url,
  }))
}
