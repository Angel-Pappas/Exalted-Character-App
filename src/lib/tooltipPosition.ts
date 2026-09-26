// Where a tooltip goes, as pure arithmetic: above its anchor if there is room,
// otherwise below, and always clamped inside the viewport. No DOM here, so
// tooltipPosition.test.ts can pin the edge cases (a stat at the top of the screen,
// a button against the right edge) without rendering anything.

export interface AnchorBox { top: number; bottom: number; left: number; right: number }
export interface Size { width: number; height: number }
export interface Placement { top: number; left: number; side: 'above' | 'below' }

/** Space kept between the tooltip and its anchor. */
export const TOOLTIP_GAP = 8
/** Space kept between the tooltip and the window edge. */
export const VIEWPORT_MARGIN = 8

export function placeTooltip(anchor: AnchorBox, tip: Size, viewport: Size): Placement {
  const roomAbove = anchor.top - TOOLTIP_GAP - VIEWPORT_MARGIN
  const roomBelow = viewport.height - anchor.bottom - TOOLTIP_GAP - VIEWPORT_MARGIN

  // Above reads naturally (it doesn't cover the row below the pointer), so it wins
  // whenever it fits. When neither side fits, take the roomier one.
  const side: Placement['side'] =
    tip.height <= roomAbove ? 'above'
    : tip.height <= roomBelow ? 'below'
    : roomAbove >= roomBelow ? 'above' : 'below'

  const idealTop = side === 'above' ? anchor.top - TOOLTIP_GAP - tip.height : anchor.bottom + TOOLTIP_GAP
  const idealLeft = (anchor.left + anchor.right) / 2 - tip.width / 2

  return {
    side,
    top: clamp(idealTop, VIEWPORT_MARGIN, viewport.height - VIEWPORT_MARGIN - tip.height),
    left: clamp(idealLeft, VIEWPORT_MARGIN, viewport.width - VIEWPORT_MARGIN - tip.width),
  }
}

// If the tooltip is bigger than the window, pin it to the top/left margin so its
// start is readable, rather than letting max < min push it off-screen.
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}
