import { StatelessBusiness } from '@xfcfam/xf'
import { R } from '../../repository/R.js'
import type { StoredFile } from '../../repository/transfers/StoredFile.js'

/**
 * Domain logic for files. Exposes file save / fetch / list and a
 * Server-Sent-Events stream generator that the FilesRestService
 * uses to demonstrate streaming responses.
 */
export class FileBusiness extends StatelessBusiness {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  async save(filename: string, mimeType: string, bytes: Uint8Array): Promise<StoredFile> {
    return R.filesRepository.store(filename, mimeType, bytes)
  }

  async findById(id: string): Promise<StoredFile | null> {
    return R.filesRepository.findById(id)
  }

  async list(): Promise<readonly StoredFile[]> {
    return R.filesRepository.list()
  }

  /**
   * Produce a Server-Sent-Events stream that emits one event per
   * second up to `count` times. Demonstrates streaming responses.
   */
  eventStream(count: number, intervalMs = 1000): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    let emitted = 0
    return new ReadableStream<Uint8Array>({
      start(controller) {
        const timer = setInterval(() => {
          emitted++
          const payload = JSON.stringify({ tick: emitted, at: new Date().toISOString() })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          if (emitted >= count) {
            clearInterval(timer)
            controller.close()
          }
        }, intervalMs)
      },
    })
  }
}
