// Where the marketing site lives.
//
// In this repository the app and the site can be two different origins or paths:
// Vite serves the app on :5173 and run-local.mjs serves ../website on :5174.
// Production serves the website and demo from the same origin. The "Get the
// Android app" row takes the visitor to the website's download section.

const PROD_SITE = typeof window === 'undefined' ? '' : window.location.origin

function localSite() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null
  const { hostname, protocol } = window.location
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) return null
  return `${protocol}//${hostname}:5174`
}

export const SITE_URL = (
  import.meta.env.VITE_ASCEND_SITE_URL || localSite() || PROD_SITE
).replace(/\/$/, '')

export const SITE_DOWNLOAD = (
  import.meta.env.VITE_ASCEND_DOWNLOAD_URL ||
  (localSite() ? `${localSite()}/#download` : `${SITE_URL}/#download`)
)

export const SITE_IS_LOCAL = SITE_URL.startsWith('http://localhost') || SITE_URL.startsWith('http://127.0.0.1')
