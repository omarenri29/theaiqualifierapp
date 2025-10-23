import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ICPDetail() {
  const router = useRouter()
  const { icpId } = router.query
  const { loading: authLoading } = useRequireAuth()
  const [icp, setIcp] = useState<any>(null)
  const [personas, setPersonas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchICP = useCallback(async () => {
    if (!icpId) return

    try {
      // Fetch ICP and personas in parallel for better performance
      const [icpResult, personasResult] = await Promise.all([
        supabase
          .from('icps')
          .select('*, companies(*)')
          .eq('id', icpId)
          .single(),
        supabase
          .from('buyer_personas')
          .select('*')
          .eq('icp_id', icpId)
      ])

      if (icpResult.error) throw icpResult.error
      if (personasResult.error) throw personasResult.error

      setIcp(icpResult.data)
      setPersonas(personasResult.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [icpId])

  useEffect(() => {
    if (!icpId || authLoading) return
    fetchICP()
  }, [icpId, authLoading, fetchICP])

  // Memoize computed values
  const companySizeRange = useMemo(() => {
    if (!icp) return ''
    return `${icp.company_size_min?.toLocaleString()} - ${icp.company_size_max?.toLocaleString()} employees`
  }, [icp])

  const revenueRange = useMemo(() => {
    if (!icp) return ''
    return `$${(icp.revenue_range_min / 1000000).toFixed(1)}M - $${(icp.revenue_range_max / 1000000).toFixed(1)}M`
  }, [icp])

  if (authLoading || loading) {
    return <div className="loading-container">Loading...</div>
  }

  if (error || !icp) {
    return <div className="error-container">Error: {error || 'ICP not found'}</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Ideal Customer Profile</h1>
        <Link href="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div className="icp-card">
        <div className="icp-header">
          <h2>{icp.title}</h2>
          <span className="badge">For: {icp.companies?.name}</span>
        </div>

        <p className="icp-description">{icp.description}</p>

        <div className="icp-criteria">
          <h3>Target Company Criteria</h3>
          <div className="criteria-grid">
            <div className="criteria-item">
              <label>Company Size</label>
              <div className="criteria-value">{companySizeRange}</div>
            </div>
            <div className="criteria-item">
              <label>Revenue Range</label>
              <div className="criteria-value">{revenueRange}</div>
            </div>
            <div className="criteria-item">
              <label>Industries</label>
              <div className="tags">
                {icp.industries?.map((ind: string) => (
                  <span key={ind} className="tag">{ind}</span>
                ))}
              </div>
            </div>
            <div className="criteria-item">
              <label>Geographic Regions</label>
              <div className="tags">
                {icp.geographic_regions?.map((region: string) => (
                  <span key={region} className="tag">{region}</span>
                ))}
              </div>
            </div>
            <div className="criteria-item">
              <label>Funding Stages</label>
              <div className="tags">
                {icp.funding_stages?.map((stage: string) => (
                  <span key={stage} className="tag">{stage}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="personas-section">
          <h3>Buyer Personas</h3>
          <div className="personas-grid">
            {personas.map((persona) => (
              <div key={persona.id} className="persona-card">
                <h4>{persona.title}</h4>
                <p className="persona-role">
                  {persona.role} • {persona.department} • {persona.seniority_level}
                </p>
                
                <div className="persona-details">
                  <div>
                    <strong>Pain Points:</strong>
                    <ul>
                      {persona.pain_points?.map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Goals:</strong>
                    <ul>
                      {persona.goals?.map((goal: string, idx: number) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="actions">
          <Link href={`/qualify?icpId=${icpId}`} className="btn-primary">
            Qualify Prospects
          </Link>
        </div>
      </div>
    </div>
  )
}
