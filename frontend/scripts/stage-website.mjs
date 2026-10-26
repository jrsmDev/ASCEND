import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.resolve(process.argv[2] || 'dist')
const siteOut = path.join(out, 'site')
const demoOut = path.join(out, 'demo')
const vercelBuild = process.argv.includes('--vercel')
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
const productionOrigin = productionHost ? `https://${productionHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : null

fs.mkdirSync(siteOut, { recursive: true })
fs.mkdirSync(demoOut, { recursive: true })

const candidatePaths = [
  path.join(ROOT, 'website'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/site'),
  path.resolve('public/site')
]

const website = candidatePaths.find(p => fs.existsSync(p))

const copyWebsiteFile = (src, dest) => {
  const extension = path.extname(src).toLowerCase()
  if (vercelBuild && ['.html', '.txt', '.xml'].includes(extension)) {
    if (path.basename(src) === 'sitemap.xml' && !productionOrigin) return false
    let contents = fs.readFileSync(src, 'utf8')
      .replaceAll('https://ascend-jet-xi.vercel.app', productionOrigin || '')
    if (path.basename(src) === 'robots.txt' && !productionOrigin) {
      contents = contents.replace(/^Sitemap:.*(?:\r?\n|$)/gm, '')
    }
    fs.writeFileSync(dest, contents)
    return true
  }
  fs.copyFileSync(src, dest)
  return true
}

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name)
    const dstPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else if (entry.isFile() && !entry.name.endsWith('.apk') && !entry.name.endsWith('.apk.sha256')) {
      copyWebsiteFile(srcPath, dstPath)
    }
  }
}

// 1. Put the browser demo at /demo so the marketing site can own the root URL.
const distIndex = path.join(out, 'index.html')
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, path.join(demoOut, 'index.html'))
} else {
  throw new Error(`Vite app entry point was not built: ${distIndex}`)
}
const distAssets = path.join(out, 'assets')
if (fs.existsSync(distAssets)) {
  copyDir(distAssets, path.join(demoOut, 'assets'))
}
const distSw = path.join(out, 'sw.js')
if (fs.existsSync(distSw)) {
  fs.copyFileSync(distSw, path.join(demoOut, 'sw.js'))
}
for (const name of ['manifest.json', 'icon.svg', 'icon-180.png', 'icon-512.png']) {
  const src = path.join(out, name)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(demoOut, name))
}

// 2. Stage the marketing site at /site and, on Vercel, at the root URL.
if (website) {
  for (const item of fs.readdirSync(website, { withFileTypes: true })) {
    if (item.name.endsWith('.apk') || item.name.endsWith('.apk.sha256')) continue
    const src = path.join(website, item.name)
    if (item.isDirectory()) {
      copyDir(src, path.join(siteOut, item.name))
      copyDir(src, path.join(out, item.name))
    } else if (item.isFile()) {
      copyWebsiteFile(src, path.join(siteOut, item.name))
      if (item.name === 'index.html') {
        if (vercelBuild) {
          copyWebsiteFile(src, path.join(out, 'index.html'))
        } else {
          copyWebsiteFile(src, path.join(out, 'site.html'))
        }
        if (vercelBuild && !productionOrigin) {
          for (const sitemap of [path.join(out, 'sitemap.xml'), path.join(siteOut, 'sitemap.xml')]) {
            fs.rmSync(sitemap, { force: true })
          }
        }
      } else {
        copyWebsiteFile(src, path.join(out, item.name))
      }
    }
  }
  console.log(`[stage-website] Website staged from ${website} to ${siteOut} and ${vercelBuild ? 'the root' : out}`)
} else {
  if (vercelBuild) throw new Error(`Website source directory not found: ${candidatePaths.join(', ')}`)
  console.log('[stage-website] No website source directory found; relying on public/site in dist.')
}

// 3. Stage the 180px exercise media used by both the site demo and standalone app.
const stageMediaScript = path.join(ROOT, 'scripts/catalogue/stage-media.mjs')
if (fs.existsSync(stageMediaScript) && !vercelBuild) {
  const { execFileSync } = await import('node:child_process')
  execFileSync(process.execPath, [stageMediaScript, out], { stdio: 'inherit' })
} else if (vercelBuild) {
  console.log('[stage-website] Exercise media will be served from the configured CDN.')
}

if (vercelBuild) {
  for (const name of ['assets', 'sw.js', 'manifest.json', 'icon.svg', 'ascend-logo.png', 'site.html']) {
    fs.rmSync(path.join(out, name), { recursive: true, force: true })
  }
  fs.rmSync(siteOut, { recursive: true, force: true })
}

console.log('[stage-website] Staging complete.')
