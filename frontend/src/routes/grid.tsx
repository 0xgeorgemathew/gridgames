import { createFileRoute } from '@tanstack/react-router'
import Client from '@/app/grid/page'
export const Route = createFileRoute('/grid')({ ssr: false, component: Client })
