# Railway Sleep Fix Plan

## Problem
The Railway app is not sleeping when idle, even though `sleepApplication: true` is configured in `railway.json`.

## Root Cause Analysis

### Primary Cause: Health Check Polling
The `healthcheckPath: "/api/health"` configuration causes Railway to send periodic HTTP requests to check app health. These requests count as traffic and reset the idle timer, preventing sleep.

**Location:** [`frontend/railway.json:13`](../frontend/railway.json:13)
```json
"healthcheckPath": "/api/health"
```

### Secondary Factor: Cleanup Interval
A persistent `setInterval` runs every 30 seconds for cleaning up stale waiting players. While this keeps the Node.js event loop active, Railway's sleep is primarily triggered by network inactivity.

**Location:** [`frontend/app/api/socket/game-events-modules/index.ts:509`](../frontend/app/api/socket/game-events-modules/index.ts:509)
```typescript
const cleanupInterval = setInterval(() => manager.cleanupStaleWaitingPlayers(), 30000)
```

## Solution: Remove Health Check (Option A)

### Changes Required

#### 1. Update `frontend/railway.json`
Remove the `healthcheckPath` and `healthcheckGracePeriod` fields:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "watchPatterns": ["**", "railpack.json", "railway.json"]
  },
  "deploy": {
    "runtime": "V2",
    "numReplicas": 1,
    "sleepApplication": true,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Trade-offs

| Aspect | With Health Check | Without Health Check |
|--------|------------------|---------------------|
| **Sleep** | ❌ Never sleeps | ✅ Sleeps when idle |
| **Cost** | Higher (always running) | Lower (pay per use) |
| **Cold starts** | N/A | ~5-10 seconds on first request |
| **Auto-restart** | ✅ Restarted if unhealthy | ❌ No automatic health-based restart |
| **Crash recovery** | ✅ Detected quickly | ⚠️ Relies on `restartPolicyType` |

### Mitigations for Removed Health Check

1. **Restart Policy**: The `restartPolicyType: "ON_FAILURE"` still restarts the app if it crashes
2. **Manual Monitoring**: Consider adding external monitoring (e.g., UptimeRobot) to alert on downtime
3. **Graceful Shutdown**: The existing SIGTERM handler in [`server.ts`](../frontend/server.ts:35) ensures clean shutdowns

### Expected Behavior After Fix

1. **Idle Period**: After ~5-10 minutes of no network activity, Railway will put the app to sleep
2. **Wake on Request**: When a user connects, the app wakes up (cold start ~5-10 seconds)
3. **Socket.IO Connections**: New WebSocket connections will trigger wake-up
4. **Price Feed**: The Binance price feed will only connect when games are active (existing behavior)

## Implementation Checklist

- [ ] Remove `healthcheckPath` from `frontend/railway.json`
- [ ] Remove `healthcheckGracePeriod` from `frontend/railway.json`
- [ ] Deploy to Railway and verify sleep behavior
- [ ] Monitor for any issues with cold starts

## Alternative Approaches (Not Chosen)

| Option | Description | Why Not Chosen |
|--------|-------------|----------------|
| B. Keep health check | Accept app stays awake | Higher cost, defeats purpose of sleep setting |
| C. External cron health check | Only ping during peak hours | Complex setup required |
| D. Conditional health check | Health endpoint responds only certain hours | App marked unhealthy when "sleeping" |
