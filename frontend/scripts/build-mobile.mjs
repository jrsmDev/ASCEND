import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(frontend, '..')
const packageJson = JSON.parse(readFileSync(resolve(frontend, 'package.json'), 'utf8'))
const version = process.env.ASCEND_ANDROID_VERSION || packageJson.version

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`ASCEND_ANDROID_VERSION must be a stable x.y.z version; received "${version}"`)
}

const env = { ...process.env, VITE_MOBILE: '1', VITE_APP_VERSION: version }

function run(args, cwd = frontend) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${args[0]} failed with ${result.signal ? `signal ${result.signal}` : `exit code ${result.status}`}`)
  }
}

run(['node_modules/vite/bin/vite.js', 'build'])
run([resolve(root, 'scripts/catalogue/stage-media.mjs'), 'dist'])
run(['node_modules/@capacitor/cli/bin/capacitor', 'sync'])
run(['scripts/check-mobile-bundle.mjs'])
