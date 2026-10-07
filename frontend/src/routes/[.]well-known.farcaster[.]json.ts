import { createFileRoute } from '@tanstack/react-router'
import { GET } from '@/app/.well-known/farcaster.json/route'
export const Route = createFileRoute('/.well-known/farcaster.json')({
  server: { handlers: { GET: () => GET() } },
})
