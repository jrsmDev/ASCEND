import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.resolve(process.argv[2] || 'dist')
const website = path.join(ROOT, 'website')
const siteOut = path.join(out, 'site')

fs.mkdirSync(siteOut, { recursive: true })

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name)
    const dstPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else if (entry.isFile() && !entry.name.endsWith('.apk')) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

// Copy website assets into dist/site and also root dist/ for direct subpages
for (const item of fs.readdirSync(website, { withFileTypes: true })) {
  if (item.name.endsWith('.apk')) continue // Skip large APK to stay within Vercel limits
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

console.log('website staged to', siteOut, 'and', out)
