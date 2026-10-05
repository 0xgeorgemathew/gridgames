# Trading game avenues — 5 October 2026

Research and proposals only. No integration, trading, or game-rule changes were made. Official sources were checked on 5 October 2026. An undated documentation page proves the documented capability, not its launch date. Venue access, current liquidity, and end-to-end mobile execution remain untested.

## Starting point

Hyper Swiper slices long/short coins. Tap Dancer uses directional rhythm input. Both share a server-authoritative Worker, Lobby Durable Object, and one GameRoom Durable Object per match. Balances are simulated. The live close-position path awards a fixed transfer from the opponent only when direction is correct. Unclosed positions expire without a transfer. This is a game rule, not exchange PnL. The shared reducers marked “NON-LIVE” are not evidence of deployed scoring.

The default round is 60 seconds. That clock must remain separate from order fills, funding, and external contract resolution. Privy/Farcaster login does not authorize an exchange order.

## Ranked avenues

### 1. Live signal duels and recorded market tournaments — best immediate fit

Use existing live prices, or give both players the same recorded tape. Binance publishes daily/monthly trade and candle files; newer spot archives use microsecond timestamps. This supports replay, but trade history cannot reconstruct exact historical queue priority or executable depth. [Binance public data](https://github.com/binance/binance-public-data).

**Hyper Swiper: Signal Sprint.** Slice an up/down token to lock a prediction for the next 5–10 seconds; ignore it to abstain. Limit outstanding predictions and score fixed-horizon direction, with a declared flat-price rule.

**Tap Dancer: Exposure Rhythm.** Up adds one virtual exposure unit; down reduces it; holding skips a beat. Score net paper PnL after a declared spread/fee model and drawdown penalty. A combo improves rhythm points, never hidden leverage.

**Daily ghost tournament.** Both UIs play an undisclosed historical segment with the same seed and market clock. Record inputs and reveal the tape after the attempt. This is a product proposal, not a newly launched venue feature. It offers fair, repeatable competition without wallet prompts. Do not describe simulated fills as actual execution.

### 2. Hyperliquid perps and existing HIP-3 markets — strongest execution path to evaluate

The documented API supports signed orders, IOC limits, reduce-only orders, and client order IDs. Approved agent wallets sign for user accounts; their nonce state belongs to the signer. Separate concurrent workloads need coordinated nonces or separate agents. Builder fees require a separate main-wallet approval. [Exchange API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint), [agent wallets](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets), [builder codes](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes).

**Swipe Position / Tap Position.** Gestures choose a capped target exposure. A distinct commit beat submits one bounded IOC order. Subsequent rhythm actions adjust the next target; a close gesture requests reduce-only execution. Score actual net fills/PnL in a live mode; venue balances stay separate from opponent game points.

Base tier perp taker fees are 0.045% per side: approximately 9 basis points for a same-notional round trip before spread, slippage, funding, or builder fees. High-frequency gesture execution can overwhelm small 60-second price moves. HIP-3 has market-specific deployer fees and growth-mode discounts; read effective fees rather than hardcoding the baseline. [Current fees](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees).

HIP-3 trading uses the same API, but markets have independent collateral/margin and deployer-operated oracles. Integrate existing markets first. Deploying a new DEX currently requires 500,000 HYPE staked and ongoing oracle operation. [HIP-3 specification](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals). No funded access or execution latency was verified here.

### 3. Polymarket probability games — strong paper fit; gated live sessions

An official 5-minute BTC market exists for **5 October 2026**. At resolution, its rule compares Chainlink's BTC/USD TWAP for the titled window with the opening reference price; equality means Up. The rule names the BTC/USD 60-second TWAP stream. It does not specify an averaging formula or exact boundary-sample selection. Raw opening/closing ticks and Binance room prices cannot substitute for that settlement source. A one-minute game could score probability changes or simulated exits, but cannot claim final contract payout at its own timeout. [Specific market and rules](https://polymarket.com/event/btc-updown-5m-1791237000).

**Probability Rhythm.** Up/down taps move a prediction through visible probability steps. Slice Up/Down tokens to allocate virtual tickets. Score a Brier score after resolution, or quote-based paper returns at round end, with the two result types clearly named. Restrict changes to defined decision beats.

Current docs describe signed CLOB orders settling on Polygon using pUSD collateral. Session keys are **beta**, cannot withdraw, work only with Deposit Wallets, and require an authorized Builder API key during rollout. The docs have no launch date; these are current documented features, not evidence that every builder has access. [Trading workflow](https://docs.polymarket.com/trading/overview), [pUSD](https://docs.polymarket.com/concepts/pusd), [session-key access](https://docs.polymarket.com/trading/session-keys).

Crypto taker fees use `shares × 0.07 × p × (1−p)` in the current table. At 50¢, 100 shares cost $50 plus a $1.75 taker fee. Makers pay zero, but a resting quote is not a guaranteed fill. Check each market's fee parameters and geoblock state before enabling execution. [Fees](https://docs.polymarket.com/trading/fees), [availability API](https://docs.polymarket.com/api-reference/geoblock).

### 4. Lighter — useful alternative with explicit speed limits

Standard accounts document zero maker/taker fees and 60 REST requests per minute, counted without weights. Plus offers 24,000 weighted read requests and 4,000 sendTx/sendTxBatch requests per minute for 0.005% per side. Both have a 300 ms taker delay: Plus improves throughput, not taker latency. Premium starts at 0.004% maker/0.028% taker with a 140 ms taker delay. These are venue delays, not total phone-to-fill latency. [Account types](https://apidocs.lighter.xyz/docs/account-types), [rate limits](https://apidocs.lighter.xyz/docs/rate-limits).

**Inventory Dance.** Tap to change a virtual target; submit only at spaced commit beats. **Maker Catch.** Slice a token to place a post-only quote; score fills and inventory control, not orders sent. Test in paper mode first. Zero fees do not remove spread, slippage, non-fills, or funding.

Lighter keys have per-key nonces and account-index scope. Unlike a narrow “trade only” assumption, documented keys can change margin and perform secure withdrawals back to the owning L1 address. Read-only tokens are suitable for account displays. Signing uses official Go/Python SDKs or a WASM signer; Workers compatibility needs a separate technical check. [Key permissions](https://apidocs.lighter.xyz/docs/api-keys).

### 5. Kalshi events, crypto perps, and metals — real expansion, limited API rollout

The **29 May 2026** perps announcement included pending reviews/waitlist language. Stronger shipped evidence is the **24 July** help article saying perps are offered, plus the **10 September** gold/silver launch. [Announcement](https://news.kalshi.com/p/kalshi-launches-perpetual-futures-america), [available product](https://help.kalshi.com/en/articles/14679970-what-are-perpetual-futures), [metals launch](https://news.kalshi.com/p/24-7-gold-silver-perpetuals-are-here).

**Metal Sprint.** Reuse either UI for gold/silver paper exposure. **Target Beat.** Predict whether price remains above a visible target. Kalshi's 15-minute guide was updated **28 September**; its resolution clock exceeds short rounds. [15-minute guide](https://prod-like.kalshi.com/pro/help/fifteen-minute-markets).

Perps production REST/WebSocket access is explicitly rolling out member by member; `/margin/enabled` checks access. US-based KYC users may apply, then need margin approval and the tutorial. Funds are held through the venue/FCM account, not the game DO. Query account fees rather than infer a universal rate. [Perps API and access status](https://docs.kalshi.com/margin), [17 August access policy](https://help.kalshi.com/en/articles/15357656-applying-for-perpetuals-access). Public API documentation is not permission for this app to intermediate retail accounts.

### 6. Hyperliquid HIP-4 bounded outcomes — watch/testnet only

HIP-4 documents fully collateralized dated outcomes without leverage/liquidation. Its deployer API is explicitly **testnet-only**. **Range Catch** could use the same tokens/buttons to predict a finish band, then score once the contract resolves. It is a useful mechanism to prototype with paper points; mainnet deployment and suitable liquidity were not verified. [Outcome primitive](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-4-outcome-markets), [testnet status](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/hip-4-deployer-actions).

## Recommended experiments and backend boundary

Start with **Signal Sprint + daily ghost tournaments**, then **Hyperliquid quote-based paper exposure**, then **Probability Rhythm on a verified short-window event**. Measure replay reproducibility, stale-feed rate, effective spread, modeled fees, and whether players understand when a gesture commits. A funded experiment is a separate decision after access and signing checks.

Keep GameRoom DOs authoritative for gestures and game points. Separate market-data adapters from execution adapters. Persist rules/version, tape or feed sequence, authoritative input time, instrument/oracle, and result provenance. D1 can hold durable match reports, tournament attempts, and an append-only points ledger; recorded tapes may need object storage. These are proposed requirements, not implemented architecture.

Funded execution additionally needs per-account nonce/order coordination across rooms, idempotent intent IDs, partial-fill reconciliation, fee/funding records, and limits on size/price/turnover. Persist intents before submission. Reconcile venue state after network failure. A room restart may interrupt the game, but cannot erase an external position. Report game outcome and financial position state separately; avoid adding match resumption merely to solve order reconciliation.
