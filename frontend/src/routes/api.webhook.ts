import { createFileRoute } from '@tanstack/react-router'
import { POST } from '@/app/api/webhook/route'
export const Route = createFileRoute('/api/webhook')({
  server: { handlers: { POST: ({ request }) => POST(request) } },
})
