'use client'
import { PropsWithChildren } from 'react'
import { usePathname } from 'next/navigation'

/** Renders its children ONLY outside /mini, using React navigation only. */
export function MainChrome({ children }: PropsWithChildren) {
  const pathname = usePathname() || '/'
  // Pure React check: if we navigated into /mini, hide chrome
  if (pathname.startsWith('/mini')) return null
  return <>{children}</>
}

/** Renders its children ONLY on /mini routes (pure React navigation). */
export function MiniOnly({ children }: PropsWithChildren) {
  const pathname = usePathname() || '/'
  return pathname.startsWith('/mini') ? <>{children}</> : null
}
