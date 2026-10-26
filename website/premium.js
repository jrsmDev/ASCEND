const menuButton = document.querySelector('.menu-toggle')
const menu = document.getElementById('site-menu')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

const founderCard = document.querySelector('.founder-card')
const founderCardHint = document.querySelector('.founder-card-hint')
const founderCardHintText = founderCardHint?.querySelector('.founder-card-hint-text')
if (founderCard && founderCardHint && founderCardHintText) {
  const setFounderCardFlipped = flipped => {
    founderCard.classList.toggle('is-flipped', flipped)
    founderCard.setAttribute('aria-pressed', String(flipped))
    founderCard.setAttribute('aria-label', flipped
      ? 'ASCEND founder card showing Joseph Rman Madrilejos. Flip to see the ASCEND side.'
      : 'ASCEND card. Flip to see founder Joseph Rman Madrilejos.')
    founderCardHintText.textContent = flipped
      ? 'ASCEND · NEVER SETTLE, ALWAYS ASCEND.'
      : 'Meet the founder'
    const hintArrow = founderCardHint.querySelector('[aria-hidden="true"]')
    if (hintArrow) hintArrow.textContent = flipped ? '↻' : '↗'
  }
  let introTimer
  founderCard.addEventListener('click', () => {
    window.clearTimeout(introTimer)
    setFounderCardFlipped(!founderCard.classList.contains('is-flipped'))
  })

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    introTimer = window.setTimeout(() => setFounderCardFlipped(true), 1800)
  }
}

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

const story = document.querySelector('.screen-story')
const storySteps = [...document.querySelectorAll('[data-screen-step]')]
const storyScreens = [...document.querySelectorAll('[data-screen-visual]')]
const storyCaption = document.getElementById('story-caption')
const storyCount = document.getElementById('story-count')
if (story && storySteps.length && storyScreens.length && storyCaption && storyCount) {
  let activeStep = -1
  const setActiveStep = index => {
    if (index === activeStep || index < 0 || index >= storySteps.length) return
    activeStep = index
    const step = storySteps[index]
    const screenName = step.dataset.screenStep
    storySteps.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === index))
    storyScreens.forEach(screen => screen.classList.toggle('is-active', screen.dataset.screenVisual === screenName))
    storyCaption.textContent = step.dataset.title || step.querySelector('h3')?.textContent || ''
    storyCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(storySteps.length).padStart(2, '0')}`
  }
  const updateStory = () => {
    const storyBounds = story.getBoundingClientRect()
    if (storyBounds.bottom <= 0 || storyBounds.top >= window.innerHeight) return
    const center = window.innerHeight * 0.5
    let nearestIndex = 0
    let nearestDistance = Infinity
    storySteps.forEach((step, index) => {
      const bounds = step.getBoundingClientRect()
      const distance = center < bounds.top
        ? bounds.top - center
        : center > bounds.bottom ? center - bounds.bottom : 0
      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    })
    setActiveStep(nearestIndex)
  }
  setActiveStep(0)
  window.addEventListener('scroll', updateStory, { passive: true })
  window.addEventListener('resize', updateStory)
  updateStory()
}

const readingProgress = document.querySelector('.reading-progress')
if (readingProgress) {
  let progressFrame = 0
  const updateProgress = () => {
    progressFrame = 0
    const distance = document.documentElement.scrollHeight - window.innerHeight
    const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0
    readingProgress.style.transform = `scaleX(${progress})`
  }
  const scheduleProgress = () => {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress)
  }
  window.addEventListener('scroll', scheduleProgress, { passive: true })
  window.addEventListener('resize', scheduleProgress)
  updateProgress()
}

const revealTargets = document.querySelectorAll('.hero-copy > *, .experience-card, .screen-step, .demo-head, .download-content, .founder-copy')
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach(target => target.classList.add('is-visible'))
} else {
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-visible')
      revealObserver.unobserve(entry.target)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

  revealTargets.forEach((target, index) => {
    target.classList.add('scroll-reveal')
    target.style.setProperty('--reveal-delay', `${Math.min(index, 8) * 0.045}s`)
    revealObserver.observe(target)
  })
}
