/**
 * Is this a phone or tablet rather than a laptop / desktop?
 *
 * Submissions are blocked on these devices, so the check leans towards
 * catching them: the browser's own mobile hint, a mobile user agent, iPadOS
 * (which reports itself as a Mac), and finally any device whose only pointer
 * is a finger — which also catches a phone in "Request desktop site" mode.
 * A touchscreen laptop still has a fine pointer (trackpad / mouse), so it passes.
 */
export function isHandheldDevice() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false

  if (navigator.userAgentData?.mobile) return true

  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true

  // iPadOS 13+ sends a desktop Safari user agent.
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true

  const media = (query) => window.matchMedia?.(query).matches ?? false
  return media('(pointer: coarse)') && !media('(any-pointer: fine)')
}
