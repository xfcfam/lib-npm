import { describe, it, expect } from 'vitest'
import { FileResponseUtils } from '../../../index'

const bytes = new Uint8Array([1, 2, 3])

describe('FileResponseUtils.attachment', () => {
  it('sets content-type and an attachment disposition with the filename', () => {
    const res = FileResponseUtils.attachment(bytes, 'report.pdf', 'application/pdf')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toBe('attachment; filename="report.pdf"')
    expect(res.body).toBe(bytes)
  })

  it('escapes quotes and backslashes in the filename', () => {
    const res = FileResponseUtils.attachment(bytes, 'a"b\\c.pdf', 'application/pdf')
    expect(res.headers['content-disposition']).toBe('attachment; filename="a\\"b\\\\c.pdf"')
  })

  it('honours a custom status', () => {
    const res = FileResponseUtils.attachment(bytes, 'f.bin', 'application/octet-stream', 201)
    expect(res.status).toBe(201)
  })
})

describe('FileResponseUtils.inline', () => {
  it('with filename + mime sets an inline disposition with the filename', () => {
    const res = FileResponseUtils.inline(bytes, 'photo.jpg', 'image/jpeg')
    expect(res.headers['content-type']).toBe('image/jpeg')
    expect(res.headers['content-disposition']).toBe('inline; filename="photo.jpg"')
  })

  it('with the (body, mime) shorthand sets inline without a filename', () => {
    const res = FileResponseUtils.inline(bytes, 'image/jpeg')
    expect(res.headers['content-type']).toBe('image/jpeg')
    expect(res.headers['content-disposition']).toBe('inline')
  })

  it('escapes the filename in the inline disposition', () => {
    const res = FileResponseUtils.inline(bytes, 'a"b.jpg', 'image/jpeg')
    expect(res.headers['content-disposition']).toBe('inline; filename="a\\"b.jpg"')
  })
})

describe('FileResponseUtils.stream', () => {
  it('sets content-type and NO content-disposition', () => {
    const s = new ReadableStream<Uint8Array>({ start(c) { c.close() } })
    const res = FileResponseUtils.stream(s, 'text/event-stream')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('text/event-stream')
    expect('content-disposition' in res.headers).toBe(false)
    expect(res.body).toBe(s)
  })
})
