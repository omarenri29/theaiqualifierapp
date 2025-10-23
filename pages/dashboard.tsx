import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth, useRequireAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface ICP {
  id: string
  title: string
  description: string
  industries?: string[]
  geographic_regions?: string[]
  created_at: string
  companies?: { name: string }
}

export default function Dashboard() {
  const { user, loading: authLoading } = useRequireAuth()
  const { signOut } = useAuth()
  const [icps, setIcps] = useState<ICP[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/')
  }, [signOut, router])

  const fetchICPs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('icps')
        .select('*, companies(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setIcps(data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchICPs()
  }, [authLoading, fetchICPs])

  // Memoize empty state check
  const hasICPs = useMemo(() => icps.length > 0, [icps.length])

  if (authLoading || loading) {
    return <div className="loading-container">Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0' }}>{user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => router.push('/onboarding')} 
            className="btn-primary"
          >
            + New ICP
          </button>
          <button 
            onClick={handleSignOut} 
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>
      </div>

      {!hasICPs ? (
        <div className="empty-state">
          <h2>No ICPs yet</h2>
          <p>Create your first Ideal Customer Profile to start qualifying prospects</p>
          <button 
            onClick={() => router.push('/onboarding')} 
            className="btn-primary"
          >
            Get Started
          </button>
        </div>
      ) : (
        <div className="icps-grid">
          {icps.map((icp) => (
            <div key={icp.id} className="icp-card-preview">
              <div className="icp-preview-header">
                <h3>{icp.title}</h3>
                <span className="badge">{icp.companies?.name}</span>
              </div>
              <p>{icp.description}</p>
              <div className="icp-meta">
                <span>{icp.industries?.length || 0} industries</span>
                <span>{icp.geographic_regions?.length || 0} regions</span>
              </div>
              <div className="actions">
                <Link href={`/icp/${icp.id}`} className="btn-secondary">
                  View ICP
                </Link>
                <Link href={`/qualify?icpId=${icp.id}`} className="btn-primary">
                  Qualify Prospects
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
