import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-10 bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="text-xl font-bold text-stone-900 tracking-tight">
            dishd
          </Link>
          <div className="flex items-center gap-6">
            <NavLink href="/feed">Feed</NavLink>
            <NavLink href="/pantry">Pantry</NavLink>
            <NavLink href="/log">Cook Log</NavLink>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
      {children}
    </Link>
  )
}
