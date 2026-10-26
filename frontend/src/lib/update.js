// Update check — compares the installed version (__APP_VERSION__) against
// ASCEND's website manifest and optionally downloads + installs the APK.
// On Android (Capacitor) the APK is downloaded natively into the cache directory (the Standard
// APK is ~224 MB: read into the WebView's memory it ran phones out of it, and
// the download is checked against its SHA-256 by the native Install plugin and handed to the
// system installer.

import { MOBILE } from './mobile.js'
import { BUILTIN_PX } from './anim-quality.js'
import { SITE_DOWNLOAD } from './site-url.js'

const DEFAULT_UPDATE_MANIFEST_URL = 'https://ascend-coral-pi.vercel.app/latest-android.json'
export const UPDATE_MANIFEST_URL = import.meta.env.VITE_ASCEND_UPDATE_MANIFEST_URL || DEFAULT_UPDATE_MANIFEST_URL

/**
 * Compares two semver strings (e.g. "1.2.11" vs "1.3.0").
 * Returns  1 if a > b, -1 if a < b, 0 if equal.
 *
 * Build metadata is dropped first. A version that says which build it came from carries it as
 * semver build metadata ("1.3.8+2026-09-18.2"), and splitting that on "." makes the patch NaN —
 * which read as 0, so a release tagged that way compared as 1.3.0 and a real update went
 * unnoticed. Semver says the metadata plays no part in precedence, so "1.3.7+anything" and
 * "1.3.7" are the same version here. Dropped on both operands, so it holds whichever side
 * carries it.
 */
function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('+')[0].split('.').map(Number)
  const pb = b.replace(/^v/, '').split('+')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff > 0) return 1
    if (diff < 0) return -1
  }
  return 0
}

/**
 * Checks the public website manifest for a newer version.
 * Returns { hasUpdate, latestVersion, apkUrl, hashUrl } or throws on network/manifest failure.
 *   - hasUpdate: true if the manifest version is newer than the running build
 *   - latestVersion: the semver string from the manifest (without "v" prefix)
 *   - apkUrl: direct download URL for this build variant, or null
 *   - hashUrl: direct download URL for its .sha256 file, or null
 */
// Settings is opened often, so one manifest request per app session is enough. A failure is not
// cached, allowing a later manual check to recover.
let cached = null
export function resetUpdateCheck() { cached = null }
export async function checkForUpdate() {
  if (!cached) cached = fetchLatest().catch(e => { cached = null; throw e })
  return cached
}
async function fetchLatest() {
  const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`ASCEND update manifest ${res.status}`)
  const latest = await res.json()
  const latestVersion = String(latest.version || '').replace(/^v/i, '')
  if (!/^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/.test(latestVersion)) {
    throw new Error('Invalid ASCEND update manifest version')
  }
  const hasUpdate = compareSemver(latestVersion, __APP_VERSION__) > 0
  const variant = latest.variants?.[APK_VARIANT]
  const apkUrl = publicHttpsUrl(variant?.apkUrl)
  const hashUrl = publicHttpsUrl(variant?.hashUrl)
  return { hasUpdate, latestVersion, apkUrl, hashUrl }
}

function publicHttpsUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/**
 * Since v1.4.2 a release carries three sideloaded APKs, the same app with different animations
 * built in: Standard (180 px, ASCEND.apk), Plus (240 px, ASCEND-Plus.apk) and HD (360 px,
 * ASCEND-HD.apk). Each installed APK only ever updates to its own kind, so a phone that picked HD
 * keeps HD, and nobody is handed a download twice the size they never asked for. The build says
 * which kind it is (VITE_APK_VARIANT, set by scripts/android/build-release.sh); a build without it
 * goes by what it has built in.
 * The checksum is the one named after the chosen APK, never just the first .sha256 in the list.
 * A release without an APK of this kind has no direct download, rather than quietly swapping it
 * for another kind. Older asset names remain recognised for tooling that still consumes releases.
 */
const ENV = import.meta.env || {}
export const APK_VARIANTS = ['standard', 'plus', 'hd']
export const APK_VARIANT = APK_VARIANTS.includes(ENV.VITE_APK_VARIANT)
  ? ENV.VITE_APK_VARIANT
  : (BUILTIN_PX >= 360 ? 'hd' : BUILTIN_PX > 180 ? 'plus' : 'standard')
const tagged = (name, tag) => new RegExp(`(^|[-_.])${tag}([-_.]|$)`, 'i').test(name)
/** Which kind an APK file name is: 'hd', 'plus' or 'standard'. */
export const apkKind = name => tagged(name, 'hd') ? 'hd' : tagged(name, 'plus') ? 'plus' : 'standard'
export function pickApk(assets, variant = APK_VARIANT) {
  const apk = assets.find(a => /\.apk$/i.test(a.name) && apkKind(a.name) === variant) || null
  const hash = apk ? assets.find(a => a.name === `${apk.name}.sha256`) || null : null
  return { apk, hash }
}

/**
 * Reads the published SHA-256 checksum as 64 hex characters, or null. On Android the small file
 * is downloaded natively to avoid WebView cross-origin restrictions.
 */
export async function fetchChecksum(hashUrl) {
  if (!hashUrl) return null
  let text
  if (MOBILE) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.downloadFile({ url: hashUrl, path: 'ascend-update.apk.sha256', directory: Directory.Cache })
    text = (await Filesystem.readFile({ path: 'ascend-update.apk.sha256', directory: Directory.Cache, encoding: Encoding.UTF8 })).data
  } else {
    const res = await fetch(hashUrl)
    if (!res.ok) return null
    text = await res.text()
  }
  const hex = String(text).trim().split(/\s/)[0]
  return /^[0-9a-f]{64}$/i.test(hex) ? hex.toLowerCase() : null
}

/**
 * Computes the SHA-256 hash of an ArrayBuffer using the Web Crypto API.
 * Returns the hex-encoded digest string.
 */
export async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Downloads the APK from `url` into the cache directory, natively and straight to disk, and
 * hands it to the Install plugin, which checks it against `expectedHash` before the installer
 * opens. Only works on the MOBILE (Capacitor) build with Android.
 *
 * @param {string} url - Direct download URL for the APK
 * @param {string} expectedHash - Expected SHA-256 hex string (from the .sha256 asset)
 * @param {function|null} onProgress - Called with (received, total) bytes during download, or null
 */
export async function downloadAndInstall(url, expectedHash, onProgress = null) {
  if (!MOBILE) {
    window.open(SITE_DOWNLOAD, '_blank', 'noopener')
    return
  }
  if (!/^[0-9a-f]{64}$/i.test(expectedHash || '')) throw new Error('no checksum to verify the download against')
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const fileName = 'ascend-update.apk'
  const listener = onProgress
    ? await Filesystem.addListener('progress', p => onProgress(p.bytes, p.contentLength))
    : null
  try {
    await Filesystem.downloadFile({ url, path: fileName, directory: Directory.Cache, progress: !!onProgress })
  } finally {
    await listener?.remove()
  }
  // The Install plugin streams the file through SHA-256 natively (300 MB never enter the
  // WebView) and refuses a mismatch before the installer opens.
  const { registerPlugin } = await import('@capacitor/core')
  const Install = registerPlugin('Install')
  await Install.installApk({ fileName, sha256: expectedHash.toLowerCase() })
}
