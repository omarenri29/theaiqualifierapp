import OpenAI from 'openai'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { ExternalServiceError } from '@/lib/errors'
import { OPENAI_CONFIG } from '@/lib/constants'

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY!,
})


export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  responseFormat?: { type: 'json_object' }
) {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: OPENAI_CONFIG.TEMPERATURE,
      ...(responseFormat && { response_format: responseFormat }),
    })

    return response.choices[0]?.message.content ?? null
  } catch (error) {
    logger.error('OpenAI API error', error)
    throw new ExternalServiceError('OpenAI', error as Error)
  }
}
