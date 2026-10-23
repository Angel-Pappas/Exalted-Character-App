import { describe, expect, it } from 'vitest'
import { fitWithin } from './imageResize'

describe('fitWithin', () => {
  it('shrinks the longest side to the limit, keeping the shape', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1000, 5000, 1000)).toEqual({ width: 200, height: 1000 })
  })

  it('never enlarges a small image', () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 })
  })

  it('keeps at least one pixel on a very thin image', () => {
    expect(fitWithin(10000, 2, 100)).toEqual({ width: 100, height: 1 })
  })
})
