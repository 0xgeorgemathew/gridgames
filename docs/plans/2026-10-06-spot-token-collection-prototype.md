# Grid Games: spot-token collection prototype

**Discussion date:** 6 October 2026; architecture update 7 October 2026

**Status:** Agreed prototype and Cloudflare architecture direction; venue research and unresolved design decisions recorded below.

**Scope:** Pivot platform migration and isolated deployment are authorized. The temporary stock prototype uses real quotes and simulated fills/settlement only. This does not authorize live-money execution.

## Product direction and relationship to existing plans

Grid Games should feel like an arcade/reflex collection game. Players catch varied, recognizable
stock tokens by swiping through them, and successful paid catches acquire actual spot tokens.
Repeated collection of a single token was rejected as boring. The interface should emphasize the
arena, catches, and acquired bag rather than investment strategy or financial optimization.

The original simulated Grid Games was a hackathon stopgap; real venue integration was the original
intent. This document records the latest spot-token prototype discussion. It supersedes conflicting
assumptions **for this prototype** in the historical
[Avantis integration plan](../../plans/real-money-integration-plan.md), including leveraged positions,
direct-to-player assets, and the claim that no game contract is needed. Existing runtime behavior and
older game modes have not been changed by this document.

## Agreed prototype rules

| Aspect                | Agreement                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core match            | Two players; a four-player extension was also discussed.                                                                                          |
| Inventory             | Varied recognizable stock tokens, subject to a future vetted allowlist.                                                                           |
| Successful paid catch | Spend a fixed **$1** to buy the caught spot token.                                                                                                |
| Player limit          | Maximum **$10 per player per match**, allowing up to **10 successful paid catches**, regardless of total wallet balance.                          |
| Failed swap           | Credit no token. Account for actual spending rather than attempted catches.                                                                       |
| Asset custody         | Purchased tokens remain in game/match contract custody during the match.                                                                          |
| Bag                   | Only tokens actually acquired for that player in that match. Unspent cash is excluded.                                                            |
| Winner                | The largest-valued acquired bag at the cutoff wins both participants' acquired bags; the same rule would cover all participants in the extension. |
| Instruments           | Spot tokens only; no leverage, futures, or options.                                                                                               |
| Opponents             | No platform-funded money bot or house opponent. A practice bot is an optional secondary mode.                                                     |

The $10 limit is an arbitrary starting prototype cap chosen to prevent a larger wallet from buying
disproportionately more catches. It is not a universal policy for future versions. It caps purchasing
power; it does not establish identical liquidity, fill quality, or market outcomes.

The winner rule uses absolute acquired-bag value, not best percentage return. It does not require
equal-value starting escrow or create a fixed monetary pot. For example, one player may acquire
seven tokens and the other ten: compare the values of their actual acquired assets at the agreed
cutoff, then award their combined acquired assets to the winner. Unspent wallet money is outside
both the comparison and the prize. The latest direction is USDG in and USDG out: determine the winner first from acquired bags at a common cutoff block, then convert acquired assets and pay later without changing that winner. Live conversion/payout remains unimplemented.

George reported seeing about 100 Uniswap token listings. That is a user observation, not an
independently vetted inventory or evidence that every listed token is suitable for the game.

## Intended player flow

1. The player funds an embedded wallet once. Privy is the current provider. The production direction is USDG in and USDG out on Robinhood Chain. Reservation or escrow of spending funds remains open.
2. Before play, establish bounded session permissions so routine swipes do not require a wallet popup
   each time. The concrete session or relayed-authorization mechanism remains open.
3. A caught token triggers a $1 spot-purchase attempt. Quotes may be hidden from the ordinary game UI,
   but are still needed internally for bounded routing and slippage. An optional advanced slippage
   setting was discussed.
4. Credit the player's bag only when the swap succeeds and the actual token amount received by
   custody is known. An input gesture, pending request, or quote alone is not a successful paid catch.
   Failed attempts add no tokens; any gas or other actual charges need the unresolved fee policy.
5. At the cutoff, value the acquired bags, determine the winner, and award the acquired assets held
   for the match. Cutoff, valuation, and payout details must be resolved before implementation.

An ERC-20 allowance, such as a USDC allowance, is permission to transfer within its limit. It is not a
reserved balance, a guarantee that funds remain available, or authorization for each game swipe.
Funding guarantees and authenticated session actions need their own design. Funding a wallet once
does not settle those questions.

## Custody and accounting model

The agreed Solidity accounting shape is conceptually:

```text
matchId → player → token → actual amount received
```

One physical contract balance for a token can back separately tracked bags across players and
matches. Balances must be attributed in the ledger; tokens do not need a separate physical wallet
for every catch. Enumerable player and asset lists are needed as appropriate for valuation and
payout, since mappings alone cannot enumerate their contents. This is an accounting requirement,
not a contract implementation or a final choice between shared and per-match escrow contracts.

Uniswap executes the external swap. The game contracts still carry responsibility for custody,
attribution, and payout. Purchased tokens are not distributed to each player per catch. Quantities
must reflect what custody actually receives rather than a quote's expected output. The eventual
security design must reconcile contract balances with all outstanding bags and prevent one match
from consuming another match's assets or paying the same entitlement twice.

## Cloudflare architecture direction (7 October update)

George strongly prefers a Cloudflare-first long-term architecture before regular users and onchain
integration. He reports that usage so far has been limited to hackathon participants, with no
permanent users as of this discussion. This is the reason to settle the framework direction now,
rather than plan a later live migration. It is a user-reported product observation, not an analytics
audit. The recent Railway-to-Cloudflare migration is recorded in the
[existing migration notes](../cloudflare-migration.md).

### Current stack and proposed framework migration

Repository inspection on 7 October confirms React 19, Next.js dependencies and App Router routes,
Vinext/Vite, Phaser, Zustand, Privy, wagmi/viem, and TanStack Query. The Vite config already uses
`@cloudflare/vite-plugin`; the Worker entry delegates application requests to Vinext and routes
multiplayer WebSockets to `Lobby` and per-match `GameRoom` Durable Objects. Workers logs and traces
are enabled in the source Wrangler config. TanStack Start is **not installed or implemented**.
See [frontend dependencies](../../frontend/package.json),
[Vite config](../../frontend/vite.config.ts), [Worker entry](../../frontend/worker/index.ts), and
[Wrangler config](../../frontend/wrangler.jsonc).

**TanStack Start is the proposed migration direction**, not a completed migration or a prerequisite
for using Cloudflare. Its official hosting guide supports Cloudflare Workers with Vite and the
Cloudflare plugin: [TanStack Start hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting#cloudflare-workers--official-partner).
TanStack Query supplies data-fetching/cache behavior; its presence does not mean the app already uses
Start. Framework changes do not automatically improve gameplay latency or swipe responsiveness.

Before implementation, audit route and API-handler mapping, server functions and SSR/browser
boundaries, auth and Farcaster flows, embedded-wallet/provider compatibility, wallet signing,
TanStack Query hydration, multiplayer upgrade/handoff routing, bindings, and build/environment
configuration. Preserve the Phaser engine and swipe feel, and verify them alongside auth and
two-client multiplayer behavior. The audit determines migration scope; this spec does not propose
rewriting the game engine.

### One synchronization implementation, one object per match

Keep **one Durable Object per match**, with WebSockets joining that match's participants. Write one
well-tested synchronization implementation and reuse it in each independent object instance. More
matches mean more instances of the same implementation; they do not require new synchronization code
or a global cross-match clock coordinator. The existing lobby may continue matchmaking without
becoming the clock or action authority for every active match. Cloudflare provides the per-object
coordination/storage model and hosts the objects:
[Durable Objects model](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/).

The application still implements synchronization. Each match authority should publish a common
start and cutoff, with a **two-minute round target**, drop/action identifiers, valid catch windows,
and comparable opportunity counts for participants. Clients estimate their offset to the match
clock and animate locally from that timeline; broadcasting every animation frame is unnecessary.
Client timestamps and locally rendered catches do not alone authorize purchases. Exact clock-offset
estimation, latency tolerance, and catch validation remain design work. Whether both players receive
the same randomized token sequence or independent sequences is also **open**.

The current repository already has per-match objects, but active rooms use standard WebSockets and
timers and mark restarted active matches as interrupted. That is a current implementation limit,
not a sufficient recovery policy for purchased assets. Cloudflare supports standard and hibernating
WebSockets; idle hibernation can save resources, while recurring timers prevent hibernation. Choose
socket/timer behavior deliberately and retain durable match/action state:
[WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

### Catch submission and chain responsibilities

The proposed latency-critical path is:

```text
local swipe → match DO validation → Worker / authorized wallet provider / RPC submission
           → game contract executes Uniswap swap, holds assets, and records the bag
           → receipt reconciliation updates match and player UI
```

The DO validates the participant, match phase, drop/catch window, unique action, and remaining player
budget. It coordinates immediate submission through the Worker, authorized wallet provider, and RPC;
ordinary catches should not first wait on a background queue. Privy is the chosen wallet provider and
a Privy-managed server wallet is the intended settlement signer. Per-catch session authority,
submission signing and nonce topology remain open. The game contract executes the Uniswap integration, receives and
holds acquired tokens, and records actual quantities using the accounting model above.

Persist action identity and pending submission state before external submission. Enforce unique
catch IDs/idempotency **onchain as well as in the DO**, bound to the match and player. Bounded session
authority, nonce management, and authoritative onchain spending limits are required; an offchain
budget check alone cannot protect funds. Concurrent pending actions must not oversubscribe the
remaining $10 cap or ten successful paid catches. The precise reservation, release, and funding
guarantees still need design.

Distinguish **accepted**, **pending**, and **confirmed**: acceptance means the match validator allowed
the action; pending means the purchase is in progress; confirmed means receipt/settlement evidence
supports the actual acquired amount. Optimistic visual feedback may keep swipes responsive, but a
pending animation is not credited custody. Receipt/finality criteria, late or pending swaps at the
cutoff, disconnects, and recovery remain open. DO storage and chain execution are not one atomic
transaction: recovery must reconcile an existing catch and transaction/nonce before deciding what
to retry, rather than create a new logical trade blindly.

### Background work, data, and observability

**Queues are optional** for background receipt reconciliation, recovery, and indexing. They are not
the default catch-submission path. Cloudflare Queues uses at-least-once delivery, so messages can
repeat, and delivery order is not guaranteed. Consumers must deduplicate by stable action/transaction
identity, tolerate out-of-order state updates, and reconcile receipts without turning delivery
retries into fresh purchases:
[delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) and
[ordering behavior](https://developers.cloudflare.com/queues/reference/how-queues-works/).

**D1 is proposed** for profiles, match history, and leaderboards. It is not the chain custody ledger
or the immediate match-action authority:
[D1 overview](https://developers.cloudflare.com/d1/). Use Workers
[logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) and
[traces](https://developers.cloudflare.com/workers/observability/traces/) to correlate match IDs,
catch IDs, submission attempts, and transaction receipts. **R2 replay/asset storage is optional**, not
a prototype requirement. The current Wrangler config has no D1, Queue, or R2 binding; these remain
proposals, not provisioned services.

This architecture direction preserves the varied-token arcade loop, $1 successful purchases, the
$10 prototype cap, contract-held acquired bags, excluded unspent cash, and the largest-bag prize
rule. Cloudflare does not settle valuation, permissions, issuer restrictions, chain finality, fees,
security, or legal review; all prior open decisions remain in force.

## Venue research record

These findings summarize research from the discussion, not a final chain selection or a production
integration assessment. Prior quote observations and transaction findings below are preserved from
that research; they are not new live-execution tests performed for this documentation change.

### Candidates and launch mechanics

- **Robinhood Chain + Uniswap** leads George's interest. Research recorded Robinhood mainnet launching
  on 1 July 2026. Uniswap's 2 July announcement confirms v2, v3, v4, and UniswapX support, including
  its Web App, Wallet, and API: [Uniswap launch announcement](https://blog.uniswap.org/robinhood-chain-is-live).
- **Base + Coinbase tokenized stocks**, including NVDAc, remains a comparison. No final chain has been
  chosen: [Base stock-token listings](https://brand.base.org/stocks).
- **Monad + Kuru** and **Solana + Jupiter** were mature benchmark alternatives for swap routing:
  [Kuru Flow overview](https://docs.kuru.io/kuru-flow/flow-overview) and
  [Jupiter Swap API](https://developers.jup.ag/docs/swap).
- **Unichain, MegaETH, and Arc** were also researched; none is selected by this spec.
- Pools' **Instant Launch** creates a native ETH/token Uniswap v4 pool at a 0.25% LP fee. This is a
  launch strategy, not proof that all stock-token swaps use that fee or route:
  [Instant Launch documentation](https://developers.uniswap.org/docs/liquidity/liquidity-launchpad/concepts/instant-launch).
  The four-hour Crowd Launch discussed in the research is unsuitable for obtaining instant round
  inventory: [Pools launch modes](https://blog.uniswap.org/pools-trade-a-new-way-to-launch-on-robinhood-chain).

### Read-only quote observations

| Venue             | Pairs and sizes checked in the discussion      | Limit of the evidence                                  |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Kuru / Monad      | $1 and $5 USDC → MON                           | Quote availability, not an executed trade.             |
| Jupiter / Solana  | $1, $5, $20, and $100 USDC → SOL               | Quote availability, not an executed trade.             |
| Kumbaya / MegaETH | $1 and $5 USDm → MEGA; observed 0.30% pool fee | Specific quote/route observation, not a universal fee. |

No transactions were executed in those quote checks. Jupiter reported 192 ms internal processing
in a response, while observed HTTP requests took roughly 3.7–8.9 seconds. These measure different
parts of a quote request and are not a live click-to-fill benchmark. Network, routing, authorization,
inclusion, and settlement still matter to the game's timing.

For fee arithmetic, twenty $1 purchases through a single 0.25% pool incur **$0.05** of that pool fee:
`20 × $1 × 0.0025`. This is 0.25% of $20, not 5% of $20. Exit trades, extra routing hops, gas, and any
other charges are additional. This illustration does not settle the game's fee treatment.

### Stock-token identity and observed protocol swaps

| Network / asset  | Official identity reference                                                                                           | Swap evidence recorded in the discussion                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Robinhood / NVDA | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`; [Robinhood token registry](https://docs.robinhood.com/chain/contracts/) | Uniswap v4 USDG → NVDA; block **82016853**, **2026-10-06 23:26:31 UTC**; [transaction](https://robinhoodchain.blockscout.com/tx/0x7aa1a29e1811ea27d59f8fa8f827798c8b94956bf3ac2c54880fd0d14f9285ff). |
| Base / NVDAc     | `0xb20000000000000000000078ee7ce2fE4908108C`; [Base official listings](https://brand.base.org/stocks)                 | Routed bundle BLUECHIP → NVDAc; block **52269868**, **2026-10-06 23:24:43 UTC**; [transaction](https://basescan.org/tx/0x0c86ec57ae87e88706f6e6dbd8defb4df4ce1c6a29d4e3916f9c8e0c7d730f7a).          |

The prior research verified protocol swaps; this supports protocol feasibility, not proof that a
particular UI initiated them, nor a guarantee that the eventual game contract can acquire and award
every token. Issuer identity and transfer eligibility must be checked for the actual contract address.

Explorer labels such as **≤0.101 s** or **≤2 s** are not measured click-to-fill times. Blockscout can
fall back to average block time when transaction timing data is absent:
[Blockscout timing source](https://github.com/blockscout/blockscout/blob/2aa8b857/apps/block_scout_web/lib/block_scout_web/views/api/v2/transaction_view.ex#L756-L784).
The discussion also cited published Robinhood 100 ms and Base 200 ms preconfirmation claims. Those
are not final-settlement guarantees and must not be presented as measured gameplay latency.

### Comparables and remaining research boundaries

Euphoria was discussed as a reference for embedded-wallet funding, per-tap transactions,
contract-held positions, and price-oracle settlement. Its exact permission model was not verified.
George explicitly confirmed its slippage setting and asked not to research that further; this is a
user-confirmed observation, not an independently sourced implementation claim.

FlashDuel and TapTapRevolution were discussed as ETHGlobal prototypes, not verified live competitors.
Namesake projects caused confusion, so no unsupported competitor or adoption claims are carried
forward. SpaceX issuer and quote checks remain separate pending research. George reports seeing
swaps, but independent successful UI quote checks across all four cases remain unresolved. That
research is not an implementation dependency or evidence of a completed venue comparison.

## Open decisions before any live-money implementation

| Area                        | Decisions still needed                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valuation and cutoff        | Designated pool prices at a common cutoff block are selected. Production manipulation resistance, stale-price policy and acquisition finality/eligibility still need design.                                                     |
| Match outcomes              | Ties, no catches, failed swaps, disconnects, abandonment, cancellation, and pending or late fills.                                                                                                                      |
| Spend enforcement           | Authoritative enforcement of both $10 actual purchase spending and ten successful paid catches; concurrent attempts, duplicate actions, retries, and guarantees that funding remains available.                         |
| Authorization               | Embedded-wallet choice; session/relayed mechanism; permitted contracts, assets, calls, amounts, match binding, expiry, revocation, and replay protection.                                                               |
| Fees and gas                | Whether the $1 purchase and $10 cap include any fees; pool/router fees, gas sponsorship or player charges, failed-attempt costs, and payout costs.                                                                      |
| Inventory                   | Vetted token allowlist, liquidity at $1 size, issuer and jurisdiction eligibility, transfer restrictions, and ability of custody contracts and winners to receive each token.                                           |
| Escrow and networks         | Shared versus per-match custody, spending-fund reservation or escrow, network selection, cross-network match policy, and payout mechanics.                                                                              |
| Security                    | Reentrancy, malicious or unusual token behavior, received-amount accounting, balance/ledger invariants, isolated match liabilities, and exactly-once payout.                                                            |
| Legal and regulatory review | Review of real asset purchases, custody, competitive prizes, eligibility, and platform responsibilities in the intended jurisdictions. Calling it a game or adding terms does not itself remove those responsibilities. |

These questions are deliberately unresolved. The next design work should answer them while
preserving the agreed arcade loop, token variety, $1 catches, prototype spending cap, and acquired-asset
winner rule. This documentation commit contains no live-money code or authorization to execute funds.

## Implemented Pivot direction and remaining live work (7 October)

The migration and additive stock arcade are described in [Cloudflare runtime notes](../cloudflare-migration.md). The short prototype period uses live per-catch quotes with simulated fills; quotes are estimates, not actual token receipts. Immediate local motion targets responsive visual feedback (100 ms target, not a measured or guaranteed quote time); the bag remains pending for the roughly one-second quote path and credits only after a valid response. Fresh-quote-at-100-ms timing is unresolved. Failed quote means no catch/no spend.

Production direction: contract custody records acquired tokens; a single Privy-managed server wallet signs the settlement result. Trusted server scoring is an accepted starting point, with a path to stronger production guarantees. Value acquired bags at the common cutoff block using designated pool prices, fix winner first, then sell/convert to USDG and pay later. Unspent wallet cash stays outside scoring and the prize. George reports gas sponsorship and intends the platform to cover gas for now; pool trading fees are separate. This work creates no paymaster, credentials, persistent grants, custody contract or live signer.

Curated ten-asset coverage is bounded and timestamped in the runtime notes; canonical identity does not guarantee every designated pool returns a fresh $1 quote. The demo currently uses shared deterministic opportunities to preserve the existing shared-drop model, not a settled final random-sequence rule. Conservative demo cancellation avoids inventing live economics for ties, pending cutoff actions, disconnected acquired bags and failed valuation. Slippage defaults and real token restrictions/finality remain open for live use.
