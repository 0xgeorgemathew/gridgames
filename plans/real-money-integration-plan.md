# Avantis Protocol Integration Plan

This document outlines the architectural and technical steps to integrate Avantis Protocol into Grid Games (Hyper Swiper) for real-money trading, running as a Base Mini App.

## Goal Description
Transform Hyper Swiper from a virtual PnL game into a real-money trading game using the Avantis Protocol on the Base blockchain. The critical requirement is a completely frictionless UX: users must be able to swipe to open and close positions instantly without MetaMask-style pop-ups, transaction signing interruptions, or gas fee prompts.

## Key Architectural Decisions

1. **Smart Contracts:** **NO custom smart contracts are necessary.** We will interface directly with Avantis's existing verified contracts on the Base network (specifically their `Trade` and `Margin` contracts) using the Avantis TypeScript SDK (`@avantis/sdk`) and/or `wagmi` which is already in the project.
2. **Fund Movement (The Ideal Flow):** 
   - Users do *not* deposit funds into our own Game contracts.
   - Users keep USDC in their Coinbase Smart Wallet (or Privy embedded wallet).
   - When a user swipes to open a position, the app executes an `openMarketTrade` on the Avantis contract using the user's USDC as collateral. When the position closes, Avantis returns the collateral + profits (or minus losses) directly to the user's wallet.
3. **Base Mini App "Accept Payments" Guide:** 
   - We will **NOT** use the basic `pay()` function described in the [Base Accept Payments guide](https://docs.base.org/mini-apps/technical-guides/accept-payments). That feature is designed for simple P2P transfers or checkout flows. Avantis requires executing complex smart contract functions (specifying leverage, pair info, slippage, etc.) which must be done via standard contract writing (`useWriteContract`).

## Achieving Zero-Popups / Zero-Interference (The "Swipe-to-Trade" UX)

To achieve the requirement where a user swipes and a position opens immediately without a wallet popup:

1. **Coinbase Smart Wallet & Spend Permissions (Session Keys):** 
   - Because we are a Base Mini App, users will connect using their Coinbase Smart Wallet.
   - We will implement **Spend Permissions** (also known as Session Keys or Magic Spend). 
   - **How it works:** When the user enters the matchmaking lobby, we present **ONE** initial approval. The user uses FaceID/Passkey to grant Grid Games permission to spend up to a specific limit (e.g., $10 USDC) on the Avantis Trade contract for the duration of the game.
   - **Result:** During the 2.5-minute game, every time the Phaser game emits a `swipe` event, the React layer automatically signs and broadcasts the Avantis transaction in the background using the pre-authorized session key. **Zero pop-ups.**
2. **Gasless Transactions (Paymaster):**
   - We will use a Paymaster (supported natively by Coinbase Smart Wallet and our existing viem/wagmi stack) to sponsor the gas fees for these trades. Users will never need ETH for gas, and will never see a gas estimation popup.

## Proposed Changes (System Architecture)

### 1. Smart Wallet Integration Layer
Implement Session Keys / Spend permissions using the Coinbase Smart Wallet SDK and Privy.
*   **Onboarding Flow:** Add a pre-game screen where users authorize a $10 USDC spend permission for the Avantis Protocol address.
*   **Gas Sponsorship:** Configure our existing bundler/paymaster to sponsor calls specifically to the Avantis trade contracts.

### 2. Trading Engine Layer
Replace the existing simulated trading store module with Avantis SDK calls.
*   **Opening Positions:** When the Phaser game fires `window.phaserEvents.emit('SWIPE_UP')`, the React frontend will immediately call `avantisSdk.trade.openMarketTrade(...)`.
*   **Position Tracking:** Listen to Avantis WebSocket/Events or poll the user's open positions to update the React UI and Phaser scene with real-time unrealized PnL from the blockchain, rather than local simulated PnL.
*   **Closing Positions:** At game end (or if the user manually closes), the server or client automatically executes `avantisSdk.trade.closeTrade(...)` using the session key.

### 3. Backend (Socket.IO) Safety Enhancements
*   The Socket.IO server will act primarily as a matchmaking and synchronization server. 
*   **Anti-Cheat:** Since trades happen on-chain directly from the user's wallet to Avantis, the blockchain acts as the ultimate source of truth for PnL. The server just verifies the on-chain trade events to determine the winner of the match.

## Verification Plan

Because this plan involves zero code changes right now, future implementation verification will involve:
1. **Manual Testing:** Deploying to Base Sepolia (Testnet). Connecting a test smart wallet, granting the session key, and verifying that 5 rapid swipes result in 5 Avantis testnet positions opening without any wallet popups.
2. **Gas Sponsoring Validation:** Checking the Paymaster dashboard to ensure transaction gas fees are successfully swallowed by the developer account and not charged to the user.
3. **Contract E2E:** Verifying that funds correctly move from the user's wallet -> Avantis Margin -> User's Wallet upon winning/losing a trade.
