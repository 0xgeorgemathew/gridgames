import { NextRequest, NextResponse } from 'next/server'

/**
 * Farcaster Mini App Webhook Handler
 *
 * Handles events from Farcaster/Base for mini app lifecycle events
 * such as app additions, removals, and notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle different webhook event types
    const { event, data } = body

    switch (event) {
      case 'frame_added':
        // User added the mini app
        console.log('Mini app added by user:', data)
        break

      case 'frame_removed':
        // User removed the mini app
        console.log('Mini app removed by user:', data)
        break

      case 'notification_enabled':
        // User enabled notifications
        console.log('Notifications enabled:', data)
        break

      case 'notification_disabled':
        // User disabled notifications
        console.log('Notifications disabled:', data)
        break

      default:
        console.log('Unknown webhook event:', event, data)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }
}
