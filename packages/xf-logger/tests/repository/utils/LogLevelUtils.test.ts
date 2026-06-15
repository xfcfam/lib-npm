import { describe, it, expect } from 'vitest'
import { LogLevelUtils, LOG_LEVELS } from '../../../index.js'

describe('LogLevelUtils', () => {
  it('orders the six levels ascending by severity', () => {
    const severities = LOG_LEVELS.map((l) => LogLevelUtils.severity(l))
    const sorted = [...severities].sort((a, b) => a - b)
    expect(severities).toEqual(sorted)
    expect(LogLevelUtils.severity('trace')).toBeLessThan(LogLevelUtils.severity('fatal'))
  })

  it('gte thresholds inclusively', () => {
    expect(LogLevelUtils.gte('warn', 'warn')).toBe(true)
    expect(LogLevelUtils.gte('error', 'warn')).toBe(true)
    expect(LogLevelUtils.gte('info', 'warn')).toBe(false)
  })

  it('compare returns the severity delta sign', () => {
    expect(LogLevelUtils.compare('debug', 'error')).toBeLessThan(0)
    expect(LogLevelUtils.compare('fatal', 'trace')).toBeGreaterThan(0)
    expect(LogLevelUtils.compare('info', 'info')).toBe(0)
  })
})
