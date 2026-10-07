import { createFileRoute } from '@tanstack/react-router'
import { GET } from '@/app/api/auth/route'
export const Route = createFileRoute('/api/auth')({
  server: { handlers: { GET: ({ request }) => GET(request) } },
})
