const menuButton = document.querySelector('.menu-toggle')
const menu = document.getElementById('site-menu')

const closeMenu = () => {
  if (!menuButton || !menu) return
  menuButton.setAttribute('aria-expanded', 'false')
  menuButton.setAttribute('aria-label', 'Open menu')
  menu.classList.remove('is-open')
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true'
  menuButton.setAttribute('aria-expanded', String(open))
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
  menu?.classList.toggle('is-open', open)
})

menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu))
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu()
})
document.addEventListener('click', event => {
  if (!menuButton?.contains(event.target) && !menu?.contains(event.target)) closeMenu()
})
window.addEventListener('resize', () => {
  if (window.innerWidth > 680) closeMenu()
})

const demo = document.querySelector('[data-demo-frame]')
if (demo) {
  const loadDemo = () => {
    if (demo.src) return
    demo.src = demo.dataset.demoFrame
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        loadDemo()
        observer.disconnect()
      }
    }, { rootMargin: '240px' })
    observer.observe(demo)
  } else {
    loadDemo()
  }
}

const download = document.getElementById('android-download')
const checksum = document.getElementById('android-checksum')
const version = document.getElementById('android-version')
const help = document.getElementById('download-help')
const validHttpsUrl = value => {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

if (download && checksum && version && help) {
  fetch('/latest-android.json', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error(`Update manifest ${response.status}`)
      return response.json()
    })
    .then(manifest => {
      const apkUrl = validHttpsUrl(manifest?.variants?.standard?.apkUrl)
      const hashUrl = validHttpsUrl(manifest?.variants?.standard?.hashUrl)
      if (!/^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/.test(manifest?.version || '') || !apkUrl || !hashUrl) {
        throw new Error('Invalid Android download manifest')
      }
      download.href = apkUrl
      download.removeAttribute('aria-disabled')
      download.textContent = 'Download for Android'
      checksum.href = hashUrl
      checksum.removeAttribute('aria-disabled')
      version.textContent = `Version ${manifest.version}`
      help.textContent = 'Android may ask you to confirm the installation.'
    })
    .catch(error => {
      console.error('Unable to load the ASCEND download:', error)
      download.textContent = 'Download temporarily unavailable'
      version.textContent = 'Version unavailable'
      help.textContent = 'Please try again shortly.'
    })
}

const copyrightYear = document.getElementById('copyright-year')
if (copyrightYear) copyrightYear.textContent = String(new Date().getFullYear())
