import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildUserMessage, AIShiftInput } from '@/lib/ai/yomogi'

export const maxDuration = 60

export async function POST(req: Request) {
  const body = await req.json() as AIShiftInput & { facilityId: string }

  if (!body.facilityId) {
    return new Response('facilityId required', { status: 400 })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const systemPrompt = buildSystemPrompt(body.facilityType)
  const userMessage = buildUserMessage(body)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
