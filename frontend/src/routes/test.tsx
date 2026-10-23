import { createFileRoute } from '@tanstack/react-router'
import Client from '@/app/test/page'
export const Route = createFileRoute('/test')({ ssr: false, component: Client })
