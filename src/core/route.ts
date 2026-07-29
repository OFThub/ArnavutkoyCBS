// Yol tabanlı iki sayfalı yönlendirme; router paketi yerine pathname + popstate yeterli.

import { useEffect, useState } from 'react'

export type AppRoute = 'tezgah' | 'rehber'

export function routeOf(pathname: string): AppRoute {
  return pathname.replace(/\/+$/, '').endsWith('/rehber') ? 'rehber' : 'tezgah'
}

export function navigate(path: string): void {
  if (window.location.pathname === path) return
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => routeOf(window.location.pathname))

  useEffect(() => {
    const onChange = (): void => setRoute(routeOf(window.location.pathname))
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])

  return route
}
