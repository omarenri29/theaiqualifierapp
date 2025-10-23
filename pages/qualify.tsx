import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function QualifyProspects() {
  const router = useRouter()
  const { icpId } = router.query
  useRequireAuth()
  const [domains, setDomains] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState('')
  const [icp, setIcp] = useState<any>(null)
  const [loadingIcp, setLoadingIcp] = useState(true)

  // Fetch ICP details to show which one we're qualifying against
  const fetchICP = useCallback(async () => {
    if (!icpId) return

    try {
      const { data, error } = await supabase
        .from('icps')
        .select('*, companies(*)')
        .eq('id', icpId)
        .single()

      if (error) throw error
      setIcp(data)
    } catch (err) {
      setError('Failed to load ICP')
    } finally {
      setLoadingIcp(false)
    }
  }, [icpId])

  useEffect(() => {
    fetchICP()
  }, [fetchICP])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResults([])

    try {
      // Parse comma-separated domains
      const domainList = domains
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0)

      if (domainList.length === 0) {
        throw new Error('Please enter at least one domain')
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Call qualification API
      const response = await fetch('/api/prospects/qualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          icpId,
          domains: domainList,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to qualify prospects')
      }

      const data = await response.json()
      setResults(data.results)
    } catch (err: any) {
      setError(err.message || 'Failed to qualify prospects')
    } finally {
      setLoading(false)
    }
  }, [domains, icpId])

  const getFitBadgeClass = useCallback((fitLevel: string) => {
    switch (fitLevel) {
      case 'excellent': return 'badge-excellent'
      case 'good': return 'badge-good'
      case 'moderate': return 'badge-moderate'
      case 'poor': return 'badge-poor'
      default: return 'badge'
    }
  }, [])

  // Memoize results check
  const hasResults = useMemo(() => results.length > 0, [results.length])

  if (loadingIcp) {
    return <div className="loading-container">Loading...</div>
  }

  if (!icp) {
    return <div className="error-container">ICP not found</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Qualify Prospects</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {icpId && (
            <Link href={`/icp/${icpId}`} className="btn-secondary">
              ← Back to ICP
            </Link>
          )}
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="qualify-card">
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Qualifying Against</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{icp.title}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>{icp.companies?.name}</span>
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Prospects will be scored based on how well they match this ICP's criteria
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="domains">Prospect Domains to Qualify</label>
            <textarea
              id="domains"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              required
              rows={4}
              placeholder="Enter domains separated by commas (e.g., apple.com, microsoft.com, google.com)"
              disabled={loading}
            />
            <small>Enter multiple domains separated by commas</small>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Analyzing prospects...' : 'Qualify Prospects'}
          </button>
        </form>
      </div>

      {hasResults && (
        <div className="results-section">
          <h2>Qualification Results</h2>
          <div className="results-grid">
            {results.map((result, idx) => (
              <div key={idx} className="result-card">
                {result.error ? (
                  <div className="result-error">
                    <h3>{result.domain}</h3>
                    <p className="error-text">Error: {result.error}</p>
                  </div>
                ) : (
                  <>
                    <div className="result-header">
                      <div>
                        <h3>{result.prospect.name}</h3>
                        <p className="domain-text">{result.domain}</p>
                      </div>
                      <div className="score-badge">
                        <div className="score">{result.qualification.score}</div>
                        <span className={getFitBadgeClass(result.qualification.fit_level)}>
                          {result.qualification.fit_level}
                        </span>
                      </div>
                    </div>

                    <p className="reasoning">{result.qualification.reasoning}</p>

                    <div className="strengths-weaknesses">
                      <div>
                        <strong>Strengths:</strong>
                        <ul>
                          {result.qualification.strengths?.map((s: string, i: number) => (
                            <li key={i} className="strength">{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Weaknesses:</strong>
                        <ul>
                          {result.qualification.weaknesses?.map((w: string, i: number) => (
                            <li key={i} className="weakness">{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="recommendation">
                      <strong>Recommendation:</strong> {result.qualification.recommendation}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
