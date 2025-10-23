import { generateCompletion } from '@/lib/openai'
import { CompanyInfo } from '@/lib/scraper'
import { logger } from '@/lib/logger'
import { ICP_DEFAULTS } from '@/lib/constants'

export interface ICPData {
  title: string
  description: string
  companySizeMin: number
  companySizeMax: number
  revenueMin: number
  revenueMax: number
  industries: string[]
  geographicRegions: string[]
  fundingStages: string[]
  personas: Array<{
    title: string
    role: string
    department: string
    seniorityLevel: string
    painPoints: string[]
    goals: string[]
  }>
}

export async function generateICP(companyInfo: CompanyInfo): Promise<ICPData> {
  const systemPrompt = `You are an expert sales and marketing strategist who specializes in creating Ideal Customer Profiles (ICPs).
Your task is to analyze a company and generate a detailed ICP that describes their best potential customers.

Consider:
- Who would benefit most from this company's products/services
- What challenges do those customers face
- What are their goals and priorities
- Company characteristics (size, industry, revenue)
- Geographic and demographic factors
`

  const userPrompt = `Based on this company information, generate a comprehensive Ideal Customer Profile:

Company: ${companyInfo.name}
Description: ${companyInfo.description}
Industry: ${companyInfo.industry}
${companyInfo.additionalContext ? `Context: ${companyInfo.additionalContext}` : ''}

Generate a detailed ICP with the following JSON structure:
{
  "title": "A short title for this ICP (e.g., 'Mid-Market SaaS Companies')",
  "description": "2-3 sentence overview of the ideal customer",
  "companySizeMin": minimum employee count (number),
  "companySizeMax": maximum employee count (number),
  "revenueMin": minimum annual revenue in USD (number),
  "revenueMax": maximum annual revenue in USD (number),
  "industries": ["array", "of", "target", "industries"],
  "geographicRegions": ["array", "of", "regions"],
  "fundingStages": ["array", "of", "funding stages like Seed, Series A, etc."],
  "personas": [
    {
      "title": "Persona name/title",
      "role": "Job title",
      "department": "Department",
      "seniorityLevel": "Seniority level (e.g., Director, VP, C-Level)",
      "painPoints": ["array", "of", "pain", "points"],
      "goals": ["array", "of", "goals"]
    }
  ]
}

Include 3-5 buyer personas that represent different decision-makers and influencers.
Be specific and actionable.
`

  try {
    const response = await generateCompletion(
      systemPrompt,
      userPrompt,
      { type: 'json_object' }
    )

    const icpData: ICPData = JSON.parse(response || '{}')

    return {
      title: icpData.title || 'Ideal Customer Profile',
      description: icpData.description || 'Generated ICP',
      companySizeMin: icpData.companySizeMin || ICP_DEFAULTS.COMPANY_SIZE_MIN,
      companySizeMax: icpData.companySizeMax || ICP_DEFAULTS.COMPANY_SIZE_MAX,
      revenueMin: icpData.revenueMin || ICP_DEFAULTS.REVENUE_MIN,
      revenueMax: icpData.revenueMax || ICP_DEFAULTS.REVENUE_MAX,
      industries: icpData.industries || [companyInfo.industry],
      geographicRegions: icpData.geographicRegions || ICP_DEFAULTS.REGIONS,
      fundingStages: icpData.fundingStages || ICP_DEFAULTS.FUNDING_STAGES,
      personas: icpData.personas || [],
    }
  } catch (error) {
    logger.error('Error generating ICP', error, { companyName: companyInfo.name })
    throw new Error('Failed to generate ICP')
  }
}
