import { generateCompletion } from '@/lib/openai'
import { CompanyInfo } from '@/lib/scraper'
import { logger } from '@/lib/logger'
import { SCORE_THRESHOLDS, FitLevel } from '@/lib/constants'

export interface QualificationResult {
  score: number
  fitLevel: FitLevel
  reasoning: string
  strengths: string[]
  weaknesses: string[]
  recommendation: string
  metadata?: any
}

export async function qualifyProspect(
  prospectInfo: CompanyInfo,
  icp: any
): Promise<QualificationResult> {
  const systemPrompt = `You are an expert sales qualification analyst. Your job is to evaluate whether a prospect company is a good fit for a given Ideal Customer Profile (ICP).

Analyze the prospect against the ICP criteria and provide:
1. A qualification score (0-100)
2. Fit level (excellent, good, moderate, or poor)
3. Detailed reasoning
4. Specific strengths (why they're a good fit)
5. Specific weaknesses (why they might not be a perfect fit)
6. A recommendation for next steps

Be honest and analytical. Consider all factors including industry, company characteristics, and how well their needs align with what the ICP represents.
`

  const userPrompt = `Evaluate this prospect against the ICP:

PROSPECT:
Name: ${prospectInfo.name}
Domain: ${prospectInfo.name}
Description: ${prospectInfo.description}
Industry: ${prospectInfo.industry}
${prospectInfo.additionalContext ? `Context: ${prospectInfo.additionalContext}` : ''}

ICP CRITERIA:
Title: ${icp.title}
Description: ${icp.description}
Target Industries: ${icp.industries?.join(', ')}
Company Size: ${icp.company_size_min} - ${icp.company_size_max} employees
Revenue Range: $${(icp.revenue_range_min / 1000000).toFixed(1)}M - $${(icp.revenue_range_max / 1000000).toFixed(1)}M
Geographic Regions: ${icp.geographic_regions?.join(', ')}
Funding Stages: ${icp.funding_stages?.join(', ')}

BUYER PERSONAS:
${icp.buyer_personas?.map((p: any) => `
- ${p.title} (${p.role} in ${p.department})
  Pain Points: ${p.pain_points?.join(', ')}
  Goals: ${p.goals?.join(', ')}
`).join('\n')}

Provide a detailed qualification analysis in JSON format:
{
  "score": 0-100 (integer),
  "fitLevel": "${FitLevel.EXCELLENT}" | "${FitLevel.GOOD}" | "${FitLevel.MODERATE}" | "${FitLevel.POOR}",
  "reasoning": "Detailed 3-4 sentence explanation of the score",
  "strengths": ["array", "of", "specific", "strengths"],
  "weaknesses": ["array", "of", "specific", "weaknesses"],
  "recommendation": "Specific recommendation for next steps (e.g., 'High priority - schedule discovery call' or 'Not a fit - deprioritize')",
  "metadata": {
    "industryMatch": true/false,
    "sizeEstimate": "estimated company size if known",
    "keyInsights": ["additional", "insights"]
  }
}

Scoring guide:
- ${SCORE_THRESHOLDS.EXCELLENT}-${SCORE_THRESHOLDS.MAX}: Excellent fit - matches all key criteria
- ${SCORE_THRESHOLDS.GOOD}-${SCORE_THRESHOLDS.EXCELLENT - 1}: Good fit - matches most criteria with minor gaps
- ${SCORE_THRESHOLDS.MODERATE}-${SCORE_THRESHOLDS.GOOD - 1}: Moderate fit - some criteria match but significant gaps exist
- ${SCORE_THRESHOLDS.MIN}-${SCORE_THRESHOLDS.MODERATE - 1}: Poor fit - major misalignment with ICP
`

  try {
    const response = await generateCompletion(
      systemPrompt,
      userPrompt,
      { type: 'json_object' }
    )

    const result: QualificationResult = JSON.parse(response || '{}')

    let fitLevel: FitLevel = result.fitLevel
    if (result.score >= SCORE_THRESHOLDS.EXCELLENT) fitLevel = FitLevel.EXCELLENT
    else if (result.score >= SCORE_THRESHOLDS.GOOD) fitLevel = FitLevel.GOOD
    else if (result.score >= SCORE_THRESHOLDS.MODERATE) fitLevel = FitLevel.MODERATE
    else fitLevel = FitLevel.POOR

    return {
      score: Math.max(SCORE_THRESHOLDS.MIN, Math.min(SCORE_THRESHOLDS.MAX, result.score || 0)),
      fitLevel,
      reasoning: result.reasoning || 'No reasoning provided',
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      recommendation: result.recommendation || 'Review manually',
      metadata: result.metadata,
    }
  } catch (error) {
    logger.error('Error qualifying prospect', error, { prospectName: prospectInfo.name })
    throw new Error('Failed to qualify prospect')
  }
}
