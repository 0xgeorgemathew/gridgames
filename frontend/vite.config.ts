import { defineConfig } from 'vite'
import vinext from 'vinext'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  resolve: {
    // Privy's Solana dependency exports only browser/node conditions; Workers use WebSocket.
    alias: {
      'rpc-websockets': new URL(
        './node_modules/rpc-websockets/dist/index.browser.mjs',
        import.meta.url
      ).pathname,
    },
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
})
