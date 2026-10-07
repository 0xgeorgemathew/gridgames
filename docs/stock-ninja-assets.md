# Stock Ninja assets

The original ten stocks are retained. Ten additional stocks were selected from a bounded first-100 direct USDG-pool sample on 7 October 2026. This is a curated collection, not an exhaustive liquidity ranking. QQQ and other ETFs were excluded from the additions.

Canonical addresses and local logos come from the [official Robinhood asset registry](https://api.robinhood.com/rhj/assets), documented by [Robinhood contracts](https://docs.robinhood.com/chain/contracts/). Liquidity is a time-specific snapshot from [GeckoTerminal’s direct USDG pool API](https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/0x5fc5360d0400a0fd4f2af552add042d716f1d168/pools). The API was queried for pages 1–5. USDG is `0x5fc5360d0400a0fd4f2af552add042d716f1d168` on chain 4663.

All additions were checked against the canonical registry and on-chain decimals (18) and symbols at block **82349532** through the existing public preview RPC. V3 contracts returned the exact stock/USDG currencies and configured fee. V4 IDs matched the full sorted currency/fee/tick-spacing/zero-hooks key hash, and the deployed StateView returned a positive price and matching LP fee at the same block. V4 IDs are not contract addresses. These are designated scoring pools; API quotes may choose other validated routes.

| Stock | Canonical token | Designated USDG pool | Protocol / fee | V4 spacing | Snapshot liquidity USD |
| --- | --- | --- | --- | --- | ---: |
| AMZN | `0x12f190a9f9d7d37a250758b26824b97ce941bf54` | `0x8ac92da74ab5f3b1d024dc1943ad7e15dc4179ef` | V3 / 0.3% | — | 831,242.69 |
| COIN | `0x6330d8c3178a418788df01a47479c0ce7ccf450b` | `0x007a13fa152f6dc383cad20a8eaab4e1e2538b606936eae2a424f8aa47d6db31` | V4 / 1% | 200 | 798,474.50 |
| AAPL | `0xaf3d76f1834a1d425780943c99ea8a608f8a93f9` | `0xc748f4671a867db48b552f6b7650bf3255e05f80f00e3f7aad1b17ccb7898fdb` | V4 / 0.3% | 60 | 674,543.22 |
| COST | `0x4ea005168d7f09a7a0ba9d1def21a479950e44c2` | `0x0a2121a50a09ed0796ae81f9c53ff9398355a398` | V3 / 0.3% | — | 625,744.27 |
| PLTR | `0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a` | `0xee430ee1003e1985e1828a01b9a20dad67ad4302994fe2abb4a173de4ac54623` | V4 / 1% | 200 | 590,488.89 |
| GME | `0x1b0e319c6a659f002271b69db8a7df2f911c153e` | `0xe9713f453adb9245b19559790c96f470a18f2fdf` | V3 / 1% | — | 552,835.13 |
| AMD | `0x86923f96303d656e4aa86d9d42d1e57ad2023fdc` | `0xde9f85fdd9e05a943a52f2c69ffafe3064a3287df03d02c9b431bc92d4781274` | V4 / 1% | 200 | 504,343.41 |
| AMC | `0x05a3d1cd21d0c88145e82600e62e7e496e0f222b` | `0xaa34fea710a1a737840329051d81d3b0b7c564d5` | V3 / 0.3% | — | 430,378.01 |
| INTC | `0xc72b96e0e48ecd4dc75e1e45396e26300bc39681` | `0x2e5a92f5013a64661a49312111be2e8abd33f56a` | V3 / 0.3% | — | 295,391.64 |
| LLY | `0x8005d266423c7ea827372c9c864491e5786600ea` | `0xf212d02146a897f5f686e9d629f6a73da534324a` | V3 / 0.05% | — | 248,675.98 |

The runtime quotes only $1 USDG estimates. Fills, spending, custody and USDG prizes remain simulated. No transaction or approval is signed or sent. The canonical names are absent from selection menus and remain readable on active discs and acquired-bag entries.
