// Where the marketing site lives.
//
// In this repository the app and the site are two different origins: Vite serves the
// app on :5173 and run-local.mjs serves ../website on :5174. Production uses
// opengym.ch, which also holds the APK downloads. The Android/iOS app never opens the
// localhost site; the "Get the Android app" row only exists in the browser build.

const PROD_SITE = 'https://ascend-jet-xi.vercel.app'

function localSite() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null
  const { hostname, protocol } = window.location
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) return null
  return `${protocol}//${hostname}:5174`
}

export const SITE_URL = (
  import.meta.env.VITE_ASCEND_SITE_URL || localSite() || PROD_SITE
).replace(/\/$/, '')

export const SITE_DOWNLOAD = SITE_URL
export const SITE_IS_LOCAL = SITE_URL.startsWith('http://localhost') || SITE_URL.startsWith('http://127.0.0.1')
