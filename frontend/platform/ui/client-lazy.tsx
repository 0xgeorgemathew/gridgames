import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
export function clientLazy<P extends object>(load: () => Promise<ComponentType<P>>) {
  const Component = lazy(async () => ({ default: await load() }))
  return function ClientLazy(props: P) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
      setMounted(true)
    }, [])
    return mounted ? (
      <Suspense fallback={null}>
        <Component {...props} />
      </Suspense>
    ) : null
  }
}
