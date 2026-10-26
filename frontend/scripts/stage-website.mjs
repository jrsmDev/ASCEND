import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.resolve(process.argv[2] || 'dist')
const siteOut = path.join(out, 'site')

fs.mkdirSync(siteOut, { recursive: true })

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
  console.log(`website staged from ${website} to ${siteOut} and ${out}`)
} else {
  console.log('No website source directory found; relying on public/site in dist.')
}
