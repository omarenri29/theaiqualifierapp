import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return <div className="loading-container">Loading...</div>
  }

  return (
    <main className="auth-container">
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>The AI Qualifier</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          Generate AI-powered Ideal Customer Profiles and qualify prospects instantly
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/signup" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Get Started
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
