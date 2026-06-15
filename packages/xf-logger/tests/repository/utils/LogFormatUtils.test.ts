import { describe, it, expect } from 'vitest'
import { LogFormatUtils, type LogRecord } from '../../../index.js'

const record: LogRecord = {
  level: 'info',
  message: 'server ready',
  timestamp: new Date('2026-06-13T10:00:00.000Z'),
  name: 'app',
  fields: { port: 8080 },
}

describe('LogFormatUtils', () => {
  it('text() renders a single readable line with level, name, message and fields', () => {
    const line = LogFormatUtils.text(record)
    expect(line).toContain('2026-06-13T10:00:00.000Z')
    expect(line).toContain('INFO')
    expect(line).toContain('[app]')
    expect(line).toContain('server ready')
    expect(line).toContain('"port":8080')
    expect(line).not.toContain('\n')
  })

  it('json() renders parseable NDJSON', () => {
    const parsed = JSON.parse(LogFormatUtils.json(record))
    expect(parsed).toMatchObject({
      level: 'info',
      name: 'app',
      message: 'server ready',
      fields: { port: 8080 },
      timestamp: '2026-06-13T10:00:00.000Z',
    })
  })

  it('omits absent name and fields', () => {
    const bare: LogRecord = { level: 'warn', message: 'x', timestamp: new Date() }
    expect(LogFormatUtils.text(bare)).not.toContain('[')
    const parsed = JSON.parse(LogFormatUtils.json(bare))
    expect(parsed.name).toBeUndefined()
    expect(parsed.fields).toBeUndefined()
  })
})
