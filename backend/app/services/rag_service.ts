import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

type RagMatch = {
  title: string
  content: string
  sourceType: string
  sourceId: number | null
  distance: number
}

export default class RagService {
  private readonly embeddingDimensions = 1536
  private readonly databaseTimeoutMs = 15_000

  public async ingest(input: {
    title: string
    content: string
    sourceType?: string
    sourceId?: number | null
    instituteId?: number | null
    metadata?: Record<string, unknown>
  }) {
    const chunks = this.chunk(input.content)
    if (!chunks.length) throw new Error('Content must contain at least one non-empty chunk')

    const embeddings = await Promise.all(chunks.map((chunk) => this.embed(chunk)))
    const trx = await this.withTimeout(
      db.transaction(),
      this.databaseTimeoutMs,
      'RAG database connection timed out after 15 seconds'
    )

    try {
      await trx.rawQuery(`SET LOCAL statement_timeout = '${this.databaseTimeoutMs}ms'`)

      const deleteQuery = trx
        .from('rag_documents')
        .where('source_type', input.sourceType ?? 'module')
      if (input.sourceId !== undefined && input.sourceId !== null) {
        deleteQuery.where('source_id', input.sourceId)
      }
      await deleteQuery.delete()

      for (const [index, chunk] of chunks.entries()) {
        await trx.table('rag_documents').insert({
          source_type: input.sourceType ?? 'module',
          source_id: input.sourceId ?? null,
          institute_id: input.instituteId ?? null,
          title: input.title,
          content: chunk,
          chunk_index: index,
          embedding: this.toVector(embeddings[index]),
          metadata: input.metadata ?? null,
        })
      }

      await trx.commit()
      return { chunks: chunks.length }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
        }),
      ])
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  public async retrieve(query: string, instituteId?: number | null, limit = 5): Promise<RagMatch[]> {
    if (!query.trim() || !env.get('EMBEDDING_API_KEY', '')) return []

    const embedding = await this.embed(query)
    const vector = this.toVector(embedding)
    const result = await db.rawQuery(
      `SELECT title, content, source_type AS "sourceType", source_id AS "sourceId",
        embedding <=> ?::vector AS distance
       FROM rag_documents
       WHERE (?::int IS NULL OR institute_id = ?::int OR institute_id IS NULL)
       ORDER BY embedding <=> ?::vector
       LIMIT ?`,
      [vector, instituteId ?? null, instituteId ?? null, vector, limit]
    )

    return result.rows as RagMatch[]
  }

  private async embed(text: string): Promise<number[]> {
    const apiKey = env.get('EMBEDDING_API_KEY', '')
    const model = env.get('EMBEDDING_MODEL', 'gemini-embedding-001')
    const isGemini = model.startsWith('gemini')
    const defaultUrl = isGemini
      ? 'https://generativelanguage.googleapis.com/v1beta/models'
      : 'https://api.openai.com/v1/embeddings'
    const endpoint = isGemini
      ? `${env.get('EMBEDDING_API_URL', defaultUrl)}/${model}:embedContent?key=${encodeURIComponent(apiKey)}`
      : env.get('EMBEDDING_API_URL', defaultUrl)
    const requestBody = isGemini
      ? {
          model: `models/${model}`,
          content: { parts: [{ text }] },
          outputDimensionality: this.embeddingDimensions,
        }
      : {
          model,
          input: text,
        }

    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isGemini ? {} : { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('Embedding request timed out after 15 seconds')
      }
      throw new Error(
        `Embedding request could not be completed: ${error instanceof Error ? error.message : 'unknown error'}`
      )
    }

    if (!response.ok) throw new Error(`Embedding request failed with status ${response.status}`)
    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>
      embedding?: { values?: number[] }
    }
    const embedding = isGemini ? payload.embedding?.values : payload.data?.[0]?.embedding
    if (!embedding || embedding.length !== this.embeddingDimensions) {
      throw new Error(`Embedding must contain exactly ${this.embeddingDimensions} dimensions`)
    }
    return embedding
  }

  private chunk(content: string): string[] {
    const words = content.trim().split(/\s+/)
    const chunks: string[] = []
    const chunkSize = 220
    const overlap = 40

    for (let start = 0; start < words.length; start += chunkSize - overlap) {
      const chunk = words.slice(start, start + chunkSize).join(' ').trim()
      if (chunk) chunks.push(chunk)
    }
    return chunks
  }

  private toVector(values: number[]): string {
    return `[${values.join(',')}]`
  }
}