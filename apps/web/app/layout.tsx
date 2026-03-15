import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'dishd', template: '%s · dishd' },
  description: 'Save, cook, and discover recipes — no more lost TikTok recipes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
