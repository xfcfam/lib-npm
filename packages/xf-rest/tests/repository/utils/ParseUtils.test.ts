import { describe, it, expect } from 'vitest'
import { ParseUtils, type Parser } from '../../../index'

describe('ParseUtils.pickParser', () => {
  it('routes application/json to the built-in JSON parser', () => {
    expect(ParseUtils.pickParser('application/json')).toBe(ParseUtils.JsonParser)
  })

  it('is case-insensitive on the media type', () => {
    expect(ParseUtils.pickParser('Application/JSON')).toBe(ParseUtils.JsonParser)
  })

  it('strips parameters after `;`', () => {
    expect(ParseUtils.pickParser('application/json; charset=utf-8')).toBe(ParseUtils.JsonParser)
  })

  it('routes any *+json suffix to the JSON parser', () => {
    expect(ParseUtils.pickParser('application/vnd.api+json')).toBe(ParseUtils.JsonParser)
    expect(ParseUtils.pickParser('application/hal+json')).toBe(ParseUtils.JsonParser)
  })

  it('routes text/* to the built-in text parser', () => {
    expect(ParseUtils.pickParser('text/plain')).toBe(ParseUtils.TextParser)
    expect(ParseUtils.pickParser('text/html')).toBe(ParseUtils.TextParser)
  })

  it('falls back to text parser for unknown content types', () => {
    expect(ParseUtils.pickParser('application/octet-stream')).toBe(ParseUtils.TextParser)
    expect(ParseUtils.pickParser('')).toBe(ParseUtils.TextParser)
  })

  it('user-provided parsers override built-in routing', () => {
    const xml: Parser = () => ({ xml: true })
    expect(ParseUtils.pickParser('application/xml', { 'application/xml': xml })).toBe(xml)
  })

  it('user-provided parser keys are matched case-insensitively', () => {
    const xml: Parser = () => ({ xml: true })
    expect(ParseUtils.pickParser('APPLICATION/XML', { 'application/xml': xml })).toBe(xml)
    expect(ParseUtils.pickParser('application/XML', { 'Application/Xml': xml })).toBe(xml)
  })

  it('JsonParser returns null on empty body', async () => {
    expect(await ParseUtils.JsonParser('')).toBeNull()
  })

  it('JsonParser parses valid JSON', async () => {
    expect(await ParseUtils.JsonParser('{"a":1}')).toEqual({ a: 1 })
  })

  it('TextParser returns the raw input verbatim', async () => {
    expect(await ParseUtils.TextParser('hello')).toBe('hello')
    expect(await ParseUtils.TextParser('')).toBe('')
  })
})
