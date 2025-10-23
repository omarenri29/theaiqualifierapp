import type { NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { analyzeCompanyDomain } from '@/lib/scraper'
import { generateICP } from '@/lib/icp-generator'
import { withAuth, withValidation, withMethod, compose, AuthenticatedRequest } from '@/lib/middleware'
import { analyzeCompanySchema } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { getClientErrorMessage, getStatusCode, ExternalServiceError } from '@/lib/errors'
import { env } from '@/lib/env'

async function handler(
  req: AuthenticatedRequest & { validatedBody: { domain: string } },
  res: NextApiResponse
) {
  try {
    const { domain } = req.validatedBody
    const userId = req.userId

    logger.info('Analyzing company domain', { domain, userId })

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${req.token}` }
        }
      }
    )

    let companyInfo
    try {
      companyInfo = await analyzeCompanyDomain(domain)
    } catch (error) {
      throw new ExternalServiceError('Company analysis', error as Error)
    }
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id, domain')
      .eq('domain', domain)
      .single()

    let company
    if (existingCompany) {
      // Company exists, check if ICP already exists
      const { data: existingICP } = await supabase
        .from('icps')
        .select('*, buyer_personas(*)')
        .eq('company_id', existingCompany.id)
        .single()

      if (existingICP) {
        logger.info('ICP already exists, returning existing data', {
          icpId: existingICP.id,
          userId,
        })
        return res.status(200).json({ 
          success: true,
          icpId: existingICP.id,
          company: existingCompany,
          icp: existingICP,
          isExisting: true,
          message: `ICP "${existingICP.title}" already exists for this company.`
        })
      }

      company = existingCompany
      logger.info('Company exists, creating new ICP', { companyId: company.id })
    } else {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          domain,
          name: companyInfo.name,
          description: companyInfo.description,
          industry: companyInfo.industry,
        })
        .select()
        .single()

      if (companyError) {
        logger.error('Failed to save company', companyError)
        throw companyError
      }
      company = newCompany
      logger.info('Company created', { companyId: company.id })
    }

    logger.info('Generating ICP', { companyId: company.id })
    let icpData
    try {
      icpData = await generateICP(companyInfo)
    } catch (error) {
      throw new ExternalServiceError('ICP generation', error as Error)
    }

    const { data: icp, error: icpError } = await supabase
      .from('icps')
      .insert({
        company_id: company.id,
        user_id: userId,
        title: icpData.title,
        description: icpData.description,
        company_size_min: icpData.companySizeMin,
        company_size_max: icpData.companySizeMax,
        revenue_range_min: icpData.revenueMin,
        revenue_range_max: icpData.revenueMax,
        industries: icpData.industries,
        geographic_regions: icpData.geographicRegions,
        funding_stages: icpData.fundingStages,
      })
      .select()
      .single()

    if (icpError) {
      logger.error('Failed to save ICP', icpError)
      throw icpError
    }

    const personasToInsert = icpData.personas.map((persona) => ({
      icp_id: icp.id,
      title: persona.title,
      role: persona.role,
      department: persona.department,
      seniority_level: persona.seniorityLevel,
      pain_points: persona.painPoints,
      goals: persona.goals,
    }))

    const { error: personasError } = await supabase
      .from('buyer_personas')
      .insert(personasToInsert)

    if (personasError) {
      logger.error('Failed to save personas', personasError)
      throw personasError
    }

    logger.info('ICP created successfully', { icpId: icp.id, userId })

    return res.status(200).json({
      success: true,
      icpId: icp.id,
      company,
      icp,
    })
  } catch (error) {
    logger.error('Error analyzing company', error, {
      userId: req.userId,
      domain: req.validatedBody.domain,
    })
    
    const statusCode = getStatusCode(error)
    const message = getClientErrorMessage(error)
    
    return res.status(statusCode).json({ error: message })
  }
}

export default compose(
  withMethod('POST'),
  withAuth,
  withValidation(analyzeCompanySchema)
)(handler)
