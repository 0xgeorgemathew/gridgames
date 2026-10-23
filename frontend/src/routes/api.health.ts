import { createFileRoute } from '@tanstack/react-router'
import { GET } from '@/app/api/health/route'
export const Route = createFileRoute('/api/health')({ server: { handlers: { GET: () => GET() } } })
