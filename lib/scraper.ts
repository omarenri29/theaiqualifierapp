import axios from 'axios'
import * as cheerio from 'cheerio'
import { generateCompletion } from '@/lib/openai'
import { cache } from '@/lib/cache'
import { SCRAPER_CONFIG, CACHE_CONFIG } from '@/lib/constants'
import { logger } from '@/lib/logger'

export interface CompanyInfo {
  name: string
  description: string
  industry: string
  additionalContext?: string
}

export async function analyzeCompanyDomain(domain: string): Promise<CompanyInfo> {
  const cacheKey = `${CACHE_CONFIG.KEY_PREFIXES.COMPANY}${domain}`
  const cached = cache.get(cacheKey)
  if (cached) {
    logger.debug('Cache hit for domain', { domain })
    return cached
  }

  try {
    // Ensure domain has protocol
    const url = domain.startsWith('http') ? domain : `https://${domain}`
    
    const response = await axios.get(url, {
      timeout: SCRAPER_CONFIG.TIMEOUT_MS,
      headers: {
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    })

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: Website blocked scraping`)
    }

    const html = response.data
    const $ = cheerio.load(html)

    // Extract basic info
    const title = $('title').text()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1 = $('h1').first().text()
    
    const paragraphs: string[] = []
    $('p').each((i, elem) => {
      if (i < SCRAPER_CONFIG.MAX_PARAGRAPHS) {
        const text = $(elem).text().trim()
        if (text.length > 20) {
          paragraphs.push(text)
        }
      }
    })

    const bodyText = paragraphs.join(' ').slice(0, SCRAPER_CONFIG.MAX_CONTENT_LENGTH)

    // Use AI to analyze and summarize the company
    const systemPrompt = `You are an expert at analyzing companies and understanding their business models. 
Based on website content, extract key information about what the company does, who they serve, and their industry.
Always return valid JSON.`

    const userPrompt = `Analyze this company website and provide a structured summary in JSON format:

Website: ${domain}
Title: ${title}
Meta Description: ${metaDescription}
Main Heading: ${h1}
Content: ${bodyText}

Return a JSON response with the following structure:
{
  "name": "Company name",
  "description": "Clear 2-3 sentence description of what the company does",
  "industry": "Primary industry/vertical",
  "additionalContext": "Any relevant additional context about their target market or unique value proposition"
}
`

    const aiResponse = await generateCompletion(
      systemPrompt,
      userPrompt,
      { type: 'json_object' }
    )

    const companyInfo = JSON.parse(aiResponse || '{}')

    const result = {
      name: companyInfo.name || domain,
      description: companyInfo.description || metaDescription || 'No description available',
      industry: companyInfo.industry || 'Technology',
      additionalContext: companyInfo.additionalContext,
    }

    cache.set(cacheKey, result)

    return result
  } catch (error: any) {
    logger.warn('Error scraping domain, using AI fallback', { domain, error: error.message })
    
    // Fallback to AI analysis with just domain name
    const systemPrompt = `You are an expert at analyzing companies. Based on a domain name, make educated guesses about the company. Always respond in JSON format.`
    const userPrompt = `Based on the domain "${domain}", provide your best estimate in JSON format:

{
  "name": "Likely company name",
  "description": "What this company likely does (2-3 sentences)",
  "industry": "Most likely industry",
  "additionalContext": "Additional context or assumptions"
}

Return valid JSON only.`
    
    try {
      const fallbackResponse = await generateCompletion(
        systemPrompt,
        userPrompt,
        { type: 'json_object' }
      )
      
      const fallbackResult = JSON.parse(fallbackResponse || '{}')
      
      const cacheKey = `${CACHE_CONFIG.KEY_PREFIXES.COMPANY}${domain}`
      cache.set(cacheKey, fallbackResult)
      
      return fallbackResult
    } catch {
      // Ultimate fallback
      return {
        name: domain,
        description: `Company at ${domain}`,
        industry: 'Technology',
      }
    }
  }
}
