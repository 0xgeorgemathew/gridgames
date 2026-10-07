import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), 'NEXT_PUBLIC_')
  return {
    resolve: {
      alias: {
        '@': new URL('./', import.meta.url).pathname,
        'rpc-websockets': new URL(
          './node_modules/rpc-websockets/dist/index.browser.mjs',
          import.meta.url
        ).pathname,
      },
    },
    // Only the explicit public prefix enters browser code. Never expose server secrets.
    define: {
      ...Object.fromEntries(
        Object.entries(publicEnv).map(([key, value]) => [
          `process.env.${key}`,
          JSON.stringify(key === 'NEXT_PUBLIC_URL' ? 'https://pivot.gridgames.space' : value),
        ])
      ),
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tanstackStart({ srcDirectory: 'src', server: { entry: '../worker/index.ts' } }),
      react(),
    ],
  }
})
