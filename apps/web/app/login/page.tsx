import type { Metadata } from 'next'
import AuthForm from '@/components/AuthForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">dishd</h1>
          <p className="mt-2 text-stone-500">Your recipe collection</p>
        </div>
        <AuthForm mode="login" />
      </div>
    </div>
  )
}
