import { describe, it, expect } from 'vitest'
import { PathUtils } from '../../../src/repository/utils/PathUtils.js'

describe('PathUtils (pure POSIX)', () => {
  it('normalizes . and .. and duplicate separators', () => {
    expect(PathUtils.normalize('/a/b/../c')).toBe('/a/c')
    expect(PathUtils.normalize('/a//b/./c')).toBe('/a/b/c')
    expect(PathUtils.normalize('a/b/')).toBe('a/b/')
    expect(PathUtils.normalize('C:\\win\\path')).toBe('C:/win/path')
  })

  it('joins segments', () => {
    expect(PathUtils.join('/a', 'b', 'c')).toBe('/a/b/c')
    expect(PathUtils.join('a', '..', 'b')).toBe('b')
    expect(PathUtils.join('/x/', '/y')).toBe('/x/y')
  })

  it('basename / extname / dirname', () => {
    expect(PathUtils.basename('/x/y/z.txt')).toBe('z.txt')
    expect(PathUtils.extname('a.tar.gz')).toBe('.gz')
    expect(PathUtils.extname('.hidden')).toBe('')
    expect(PathUtils.dirname('/a/b/c')).toBe('/a/b')
  })

  it('isAbsolute', () => {
    expect(PathUtils.isAbsolute('/x')).toBe(true)
    expect(PathUtils.isAbsolute('x/y')).toBe(false)
  })

  it('relative between absolute paths', () => {
    expect(PathUtils.relative('/a/b/c', '/a/b/d/e')).toBe('../d/e')
    expect(PathUtils.relative('/data/files', '/data/files/logs/app.log')).toBe('logs/app.log')
    expect(PathUtils.relative('/a/b', '/a/b')).toBe('')
  })

  it('stripExtension', () => {
    expect(PathUtils.stripExtension('foo.txt')).toBe('foo')
    expect(PathUtils.stripExtension('/a/b/c')).toBe('c')
  })
})
