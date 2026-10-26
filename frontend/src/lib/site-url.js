// Where the marketing site lives.
//
// In this repository the app and the site are two different origins: Vite serves the
// app on :5173 and run-local.mjs serves ../website on :5174. Production uses
// https://ascend-jet-xi.vercel.app/site. The Android/iOS app never opens the
// localhost site; the "Get the Android app" row only exists in the browser build.

function localSite() {
  if (typeof window === 'undefined') return null
  const { hostname, protocol } = window.location
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) {
    return `${protocol}//${hostname}:5174`
  }
  return null
}

const PROD_SITE = 'https://ascend-jet-xi.vercel.app/site'

export const SITE_URL = (
  import.meta.env.VITE_ASCEND_SITE_URL || localSite() || PROD_SITE
).replace(/\/$/, '')

export const SITE_DOWNLOAD = (
  import.meta.env.VITE_ASCEND_DOWNLOAD_URL ||
  (localSite() ? `${localSite()}/#download` : `${SITE_URL}/#download`)
)

export const SITE_IS_LOCAL = SITE_URL.startsWith('http://localhost') || SITE_URL.startsWith('http://127.0.0.1')
