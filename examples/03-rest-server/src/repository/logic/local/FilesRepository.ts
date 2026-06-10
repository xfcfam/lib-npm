import { Repository } from '@xfcfam/xf'
import { randomUUID } from 'node:crypto'
import type { StoredFile } from '../../transfers/StoredFile.js'

interface State { files: Map<string, StoredFile> }

/**
 * In-memory blob store for files uploaded via the REST API. Useful
 * for the example; a real artefact would extend `FileRepository`
 * from `@xfcfam/xf-fs` (or an object-store wrapper).
 */
export class FilesRepository extends Repository<State> {
  constructor() { super({ files: new Map() }) }

  override async init(): Promise<void> {
    // Seed a tiny PNG so /files/sample/preview returns something.
    const sample: StoredFile = {
      id: 'sample',
      filename: 'sample.png',
      mimeType: 'image/png',
      bytes: FilesRepository.tinyPng(),
      uploadedAt: new Date(),
    }
    this.state.files.set(sample.id, sample)
  }

  override async terminate(): Promise<void> {
    this.state.files.clear()
  }

  async findById(id: string): Promise<StoredFile | null> {
    return this.state.files.get(id) ?? null
  }

  async store(filename: string, mimeType: string, bytes: Uint8Array): Promise<StoredFile> {
    const file: StoredFile = {
      id: randomUUID(),
      filename,
      mimeType,
      bytes,
      uploadedAt: new Date(),
    }
    this.state.files.set(file.id, file)
    return file
  }

  async list(): Promise<readonly StoredFile[]> {
    return [...this.state.files.values()]
  }

  private static tinyPng(): Uint8Array {
    // 1x1 transparent PNG (smallest valid).
    return Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ])
  }
}
