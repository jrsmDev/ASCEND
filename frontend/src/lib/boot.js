// The boot screen in index.html: markup and CSS only, so the web image's CSP needs no new hash.
// It goes once the app can draw, or on a script error before that, so it never lifts forever.
//
// A very fast boot used to make the brand flash for two frames, which read as a glitch. Hold it
// for a short beat instead, long enough to see the reveal and the progress line finish. The clock
// starts at navigation, so a cold load that already took a second does not wait again.
const MIN_BOOT_MS = 1500
const REDUCED_MS = 120
let hiding = false

export function hideBoot() {
  const b = document.getElementById('boot')
  if (!b || hiding) return
  hiding = true

  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = Math.max(0, (reduced ? REDUCED_MS : MIN_BOOT_MS) - performance.now())
  const out = () => {
    if (!document.body.contains(b)) return
    b.className = 'out'
    setTimeout(() => b.remove(), 420)
  }
  if (wait > 0) setTimeout(out, wait)
  else out()
}
