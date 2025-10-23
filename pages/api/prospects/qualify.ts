import type { NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { analyzeCompanyDomain } from '@/lib/scraper'
import { qualifyProspect } from '@/lib/qualifier'
import { withAuth, withValidation, withMethod, compose, AuthenticatedRequest } from '@/lib/middleware'
import { qualifyProspectsSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { getClientErrorMessage, getStatusCode, NotFoundError } from '@/lib/errors'
import { env } from '@/lib/env'

async function handler(
  req: AuthenticatedRequest & { validatedBody: { icpId: string; domains: string[] } },
  res: NextApiResponse
) {
  try {
    const { icpId, domains } = req.validatedBody
    const userId = req.userId

    logger.info('Qualifying prospects', { icpId, domainCount: domains.length, userId })

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${req.token}` }
        }
      }
    )

    const { data: icp, error: icpError } = await supabase
      .from('icps')
      .select('*, buyer_personas(*)')
      .eq('id', icpId)
      .single()

    if (icpError || !icp) {
      throw new NotFoundError('ICP')
    }

    const results = await Promise.allSettled(
      domains.map(async (domain) => {
        try {
          const prospectInfo = await analyzeCompanyDomain(domain)

          const { data: prospect, error: prospectError } = await supabase
            .from('prospects')
            .insert({
              icp_id: icpId,
              user_id: userId,
              domain,
              name: prospectInfo.name,
              description: prospectInfo.description,
              industry: prospectInfo.industry,
            })
            .select()
            .single()

          if (prospectError) throw prospectError

          const qualificationResult = await qualifyProspect(prospectInfo, icp)

          const { data: qualification, error: qualError } = await supabase
            .from('qualifications')
            .insert({
              prospect_id: prospect.id,
              icp_id: icpId,
              user_id: userId,
              score: qualificationResult.score,
              fit_level: qualificationResult.fitLevel,
              reasoning: qualificationResult.reasoning,
              strengths: qualificationResult.strengths,
              weaknesses: qualificationResult.weaknesses,
              recommendation: qualificationResult.recommendation,
              metadata: qualificationResult.metadata,
            })
            .select()
            .single()

          if (qualError) throw qualError

          return {
            domain,
            prospect,
            qualification,
          }
        } catch (error) {
          logger.error('Error processing domain', error, { domain, userId })
          throw error
        }
      })
    )

    const formattedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          domain: domains[index],
          error: getClientErrorMessage(result.reason),
        }
      }
    })

    const successCount = results.filter(r => r.status === 'fulfilled').length
    logger.info('Qualification complete', {
      icpId,
      totalDomains: domains.length,
      successCount,
      failureCount: domains.length - successCount,
      userId,
    })

    return res.status(200).json({
      success: true,
      results: formattedResults,
      summary: {
        total: domains.length,
        successful: successCount,
        failed: domains.length - successCount,
      },
    })
  } catch (error) {
    logger.error('Error qualifying prospects', error, {
      userId: req.userId,
      icpId: req.validatedBody.icpId,
    })
    
    const statusCode = getStatusCode(error)
    const message = getClientErrorMessage(error)
    
    return res.status(statusCode).json({ error: message })
  }
}

export default compose(
  withMethod('POST'),
  withAuth,
  withValidation(qualifyProspectsSchema)
)(handler)
