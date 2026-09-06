import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RagService from '#services/rag_service'

@inject()
export default class RagController {
  constructor(private ragService: RagService) {}

  public async ingest({ request, response, auth }: HttpContext) {
    const payload = request.only(['title', 'content', 'sourceType', 'sourceId', 'metadata'])

    if (typeof payload.title !== 'string' || !payload.title.trim()) {
      return response.badRequest({ success: false, message: 'title is required' })
    }
    if (typeof payload.content !== 'string' || !payload.content.trim()) {
      return response.badRequest({ success: false, message: 'content is required' })
    }

    const user = auth.user as { instituteId?: number | null } | undefined
    try {
      const result = await this.ragService.ingest({
        title: payload.title.trim(),
        content: payload.content,
        sourceType: typeof payload.sourceType === 'string' ? payload.sourceType : 'module',
        sourceId: typeof payload.sourceId === 'number' ? payload.sourceId : null,
        instituteId: user?.instituteId ?? null,
        metadata:
          typeof payload.metadata === 'object' && payload.metadata !== null
            ? (payload.metadata as Record<string, unknown>)
            : undefined,
      })

      return response.created({ success: true, ...result })
    } catch (error: unknown) {
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'RAG ingestion failed',
      })
    }
  }
}