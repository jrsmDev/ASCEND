import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.resolve(process.argv[2] || 'dist')
const siteOut = path.join(out, 'site')
const demoOut = path.join(out, 'demo')

fs.mkdirSync(siteOut, { recursive: true })
fs.mkdirSync(demoOut, { recursive: true })

const candidatePaths = [
  path.join(ROOT, 'website'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/site'),
  path.resolve('public/site')
]

const website = candidatePaths.find(p => fs.existsSync(p))

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name)
    const dstPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else if (entry.isFile() && !entry.name.endsWith('.apk') && !entry.name.endsWith('.apk.sha256')) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

// 1. Copy website files to dist/site and also root dist/ (except overwriting the main index.html)
if (website) {
  for (const item of fs.readdirSync(website, { withFileTypes: true })) {
    if (item.name.endsWith('.apk') || item.name.endsWith('.apk.sha256')) continue
    const src = path.join(website, item.name)
    if (item.isDirectory()) {
      copyDir(src, path.join(siteOut, item.name))
      copyDir(src, path.join(out, item.name))
    } else if (item.isFile()) {
      fs.copyFileSync(src, path.join(siteOut, item.name))
      if (item.name === 'index.html') {
        fs.copyFileSync(src, path.join(out, 'site.html'))
      } else {
        fs.copyFileSync(src, path.join(out, item.name))
      }
    }
  }
  console.log(`[stage-website] Website staged from ${website} to ${siteOut} and ${out}`)
} else {
  console.log('[stage-website] No website source directory found; relying on public/site in dist.')
}

// 2. Stage demo app copy to dist/demo so /demo/ can be accessed directly or framed
const distIndex = path.join(out, 'index.html')
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, path.join(demoOut, 'index.html'))
}
const distAssets = path.join(out, 'assets')
if (fs.existsSync(distAssets)) {
  copyDir(distAssets, path.join(demoOut, 'assets'))
}
const distSw = path.join(out, 'sw.js')
if (fs.existsSync(distSw)) {
  fs.copyFileSync(distSw, path.join(demoOut, 'sw.js'))
}

// 3. Stage 180px exercise media if stage-media.mjs exists (shared between / and /demo via rewrite)
const stageMediaScript = path.join(ROOT, 'scripts/catalogue/stage-media.mjs')
if (fs.existsSync(stageMediaScript)) {
  try {
    const { execSync } = await import('node:child_process')
    execSync(`node "${stageMediaScript}" "${out}"`, { stdio: 'inherit' })
  } catch (err) {
    console.warn('[stage-website] Optional media staging skipped or failed:', err.message)
  }
}

console.log('[stage-website] Staging complete.')
