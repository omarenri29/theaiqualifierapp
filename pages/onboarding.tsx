import { useState } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function Onboarding() {
  const { loading: authLoading } = useRequireAuth()
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Clean up domain input
      const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
      
      // Call API to analyze company and generate ICP
      const response = await fetch('/api/company/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ domain: cleanDomain }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze company')
      }

      const data = await response.json()
      
      // ICP created or already exists - redirect to ICP page
      
      // Redirect to ICP page (works for both new and existing ICPs)
      router.push(`/icp/${data.icpId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze company')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="loading-container">Loading...</div>
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <h1>Let's Get Started</h1>
        <p className="subtitle">
          Enter your company domain to generate an Ideal Customer Profile
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="domain">Company Domain</label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              placeholder="example.com"
              disabled={loading}
            />
            <small>Enter your company's website domain (e.g., windmillgrowth.com)</small>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Analyzing company...' : 'Generate ICP'}
          </button>
        </form>

        <div className="info-box">
          <h3>What happens next?</h3>
          <ul>
            <li>We'll analyze your company website</li>
            <li>Understand what your company does</li>
            <li>Generate a detailed Ideal Customer Profile</li>
            <li>Create buyer personas for your target customers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
