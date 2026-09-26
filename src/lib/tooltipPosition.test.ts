import { describe, expect, it } from 'vitest'
import { placeTooltip, TOOLTIP_GAP, VIEWPORT_MARGIN } from './tooltipPosition'

const viewport = { width: 1000, height: 800 }
const tip = { width: 200, height: 100 }
// A 40×20 anchor with its top-left corner at (x, y).
const anchorAt = (x: number, y: number) => ({ top: y, bottom: y + 20, left: x, right: x + 40 })

// Every placement must sit fully inside the window, whatever else happens.
function expectInside(p: { top: number; left: number }, size = tip) {
  expect(p.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN)
  expect(p.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN)
  expect(p.left + size.width).toBeLessThanOrEqual(viewport.width - VIEWPORT_MARGIN)
  expect(p.top + size.height).toBeLessThanOrEqual(viewport.height - VIEWPORT_MARGIN)
}

describe('placeTooltip — tooltips sit by their anchor and never leave the window', () => {
  it('goes above the anchor, centred, when there is room', () => {
    const p = placeTooltip(anchorAt(400, 400), tip, viewport)
    expect(p.side).toBe('above')
    expect(p.top).toBe(400 - TOOLTIP_GAP - tip.height)
    expect(p.left).toBe(420 - tip.width / 2)
  })

  it('flips below when the anchor is too close to the top of the window', () => {
    const p = placeTooltip(anchorAt(400, 30), tip, viewport)
    expect(p.side).toBe('below')
    expect(p.top).toBe(50 + TOOLTIP_GAP)
    expectInside(p)
  })

  it('slides left to stay inside the right edge', () => {
    const p = placeTooltip(anchorAt(960, 400), tip, viewport)
    expect(p.left).toBe(viewport.width - VIEWPORT_MARGIN - tip.width)
    expectInside(p)
  })

  it('slides right to stay inside the left edge', () => {
    const p = placeTooltip(anchorAt(0, 400), tip, viewport)
    expect(p.left).toBe(VIEWPORT_MARGIN)
    expectInside(p)
  })

  it('takes the roomier side and clamps when neither side fits', () => {
    const tall = { width: 200, height: 500 }
    const p = placeTooltip(anchorAt(400, 300), tall, viewport)
    expect(p.side).toBe('below') // 472px below vs 284px above
    expectInside(p, tall)
  })

  it('pins an oversized tooltip to the top-left margin rather than off-screen', () => {
    const huge = { width: 2000, height: 2000 }
    const p = placeTooltip(anchorAt(400, 400), huge, viewport)
    expect(p.top).toBe(VIEWPORT_MARGIN)
    expect(p.left).toBe(VIEWPORT_MARGIN)
  })
})
