// Behaviour for the ASCEND site: the header's navigation sheet, the contents
// drawer and its scrollspy, the scroll reveals, the demo frame, the scroll-driven
// screen sequence, and the two things that come from the GitHub API (repo counts,
// release timeline). Every one of them fails soft: the page is complete without
// any of this running.

const GH_REPO = 'https://api.github.com/repos/jrsmDev/ASCEND'

// Discord publishes an invite's guild counts to anyone who asks for the invite with
// ?with_counts=1. No bot token, no widget to enable, and the API reflects the caller's
// Origin, so the browser is allowed to read it. The code is the permanent invite in the
// nav; if that invite is ever revoked this returns 404 and the count simply stays blank.
const DC_INVITE = 'https://discord.com/api/v10/invites/e62jY6fwVb?with_counts=1'
// The two network lookups below are decoration; they wait until the page is idle so they
// never compete with the stylesheet, the hero image or the demo frame.
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200))

/* ------------------------------------------------------- one panel controller
   The navigation sheet and the contents drawer are the same object with different
   contents: one opener, one close button, Escape, a tap outside, focus held inside
   while open and handed back to the opener on close. Writing it once is the only
   way the two of them can stay indistinguishable to a reader.

   Both are CLOSED in CSS, so a panel is shut on first paint whatever this script
   does, and nothing is read back from storage to reopen one. */
const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

function panel({ opener, panelEl, flag, closeBtn }) {
  if (!opener || !panelEl) return null
  const body = document.body
  let lastFocus = null

  const isOpen = () => body.classList.contains(flag)

  const set = open => {
    if (open === isOpen()) return
    if (open) lastFocus = document.activeElement
    body.classList.toggle(flag, open)
    opener.setAttribute('aria-expanded', String(open))
    panelEl.setAttribute('aria-hidden', String(!open))
    // The panel scrolls on its own; letting the page scroll behind it is the classic
    // menu bug where the reader loses their place on close.
    body.style.overflow = open ? 'hidden' : ''
    if (open) {
      // The close button first: it is the answer to "how do I get out of this".
      const first = panelEl.querySelector(closeBtn) || panelEl.querySelector(FOCUSABLE)
      first && first.focus({ preventScroll: true })
    } else if (lastFocus && document.contains(lastFocus)) {
      lastFocus.focus({ preventScroll: true })
    }
  }

  opener.addEventListener('click', e => { e.stopPropagation(); set(!isOpen()) })
  panelEl.querySelector(closeBtn)?.addEventListener('click', () => set(false))
  // Tapping a link inside navigates, so the panel has to get out of the way,
  // in-page anchors especially, which do not reload anything.
  panelEl.addEventListener('click', e => { if (e.target.closest('a')) set(false) })
  // The scrim is body::after, so it has no element of its own to listen on. A click
  // that lands outside both the panel and its opener is a click on the scrim.
  document.addEventListener('click', e => {
    if (!isOpen()) return
    if (e.target.closest('#' + panelEl.id) || e.target.closest('#' + opener.id)) return
    set(false)
  })
  document.addEventListener('keydown', e => {
    if (!isOpen()) return
    if (e.key === 'Escape') { e.preventDefault(); set(false); return }
    if (e.key !== 'Tab') return
    // Focus trap: Tab cycles inside the open panel instead of wandering the page
    // behind the scrim, where nothing is clickable anyway.
    const items = [...panelEl.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  })
  return { set, isOpen }
}

;(() => {
  const nav = panel({
    opener: document.querySelector('.nav-toggle'),
    panelEl: document.getElementById('sitemenu'),
    flag: 'menu-open',
    closeBtn: '.nl'          // the hamburger itself is the ✕; focus the first link
  })
  const toc = panel({
    opener: document.querySelector('.toc-btn'),
    panelEl: document.getElementById('menu'),
    flag: 'contents-open',
    closeBtn: '.rail-close'
  })
  // Only one at a time: opening either closes the other, so there is never a
  // question of which panel a tap outside belongs to.
  document.querySelector('.nav-toggle')?.addEventListener('click', () => toc?.set(false))
  document.querySelector('.toc-btn')?.addEventListener('click', () => nav?.set(false))
  // Growing past the header breakpoint puts the links back in the bar, which would
  // leave the page scroll-locked behind a sheet nobody can see.
  addEventListener('resize', () => { if (innerWidth >= 1000) nav?.set(false) })

  // On a wide screen the docs and API pages show the contents as a fixed column
  // (body.dock in styles.css). It is not a closed drawer there, so it must not be
  // hidden from screen readers either.
  const menu = document.getElementById('menu')
  const wide = matchMedia('(min-width: 1200px)')
  const syncDock = () => {
    if (!menu || !document.body.classList.contains('dock')) return
    if (wide.matches) { toc?.set(false); menu.setAttribute('aria-hidden', 'false') }
    else if (!document.body.classList.contains('contents-open')) menu.setAttribute('aria-hidden', 'true')
  }
  syncDock()
  wide.addEventListener?.('change', syncDock)

  // An earlier build remembered an open rail across visits. It no longer does, and
  // the stale key would otherwise sit in the browser forever.
  try { localStorage.removeItem('og_rail') } catch (e) {}
})()

/* --------------------------------------------------------------- you are here
   Marked at runtime rather than baked into each page: that is what lets all four
   pages ship the byte-identical header the whole site is built around. Only links
   to a page (not to a section of one) can be "the page you are on". */
;(() => {
  const here = location.pathname.replace(/\/index\.html$/, '/')
  document.querySelectorAll('.nav-quick .ql, .navsheet .nl').forEach(a => {
    const href = a.getAttribute('href') || ''
    if (href.includes('#') || /^https?:/.test(href)) return
    if (new URL(a.href).pathname.replace(/\/index\.html$/, '/') === here) {
      a.setAttribute('aria-current', 'page')
    }
  })
})()

/* ------------------------------------------------------------------- scrollspy
   The topic rail marks the section under the reader. Position math on scroll, not
   an IntersectionObserver: the sections differ wildly in height, and "the last
   heading that scrolled past a third of the screen" is the answer people expect. */
;(() => {
  const links = [...document.querySelectorAll('.side-link[href^="#"]')]
  if (!links.length) return
  const pairs = links
    .map(a => [document.getElementById(a.getAttribute('href').slice(1)), a])
    .filter(([t]) => t)
  if (!pairs.length) return
  let lit = null
  let raf = 0
  const spy = () => {
    raf = 0
    const y = scrollY + innerHeight * .33
    let cur = null
    for (const [t, a] of pairs) {
      if (t.getBoundingClientRect().top + scrollY <= y) cur = a
    }
    if (cur === lit) return
    lit?.classList.remove('on')
    ;(lit = cur)?.classList.add('on')
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(spy) }, { passive: true })
  addEventListener('resize', spy)
  spy()
})()

/* ----------------------------------------------------------- count-up figures
   Numbers that land: a cubic ease-out tick from zero, fired once at half
   visibility. A linear count reads as a slot machine, so most of the
   distance goes by in the first third and the last digits settle slowly.
   Under reduced motion the final value is written immediately. */
;(() => {
  const els = document.querySelectorAll('.count-up[data-count-to]')
  if (!els.length) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(el => { el.textContent = el.dataset.countTo; el.removeAttribute('data-count-to') })
    return
  }
  const tick = el => {
    const to = Number(el.dataset.countTo)
    el.removeAttribute('data-count-to')
    if (!to) { el.textContent = String(to); return }
    const t0 = performance.now(), ms = 1400
    const step = now => {
      const k = Math.min(1, (now - t0) / ms)
      const eased = 1 - Math.pow(1 - k, 3)      // ease-out cubic: the last digits settle
      el.textContent = Math.round(to * eased)
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) if (e.isIntersecting) { tick(e.target); obs.unobserve(e.target) }
  }, { threshold: .5 })
  els.forEach(el => io.observe(el))
})()

/* ------------------------------------------------------------ chapter groups
   Where a rail has chapters with subchapters (.side-group / .side-subs), the group
   being read unfolds and the others stay closed, so a long contents list is never
   a wall. A no-op on the pages whose rail is a flat list. */
;(() => {
  const groups = [...document.querySelectorAll('.side-group')]
  if (!groups.length) return
  const openGroup = g => groups.forEach(x => x.classList.toggle('open', x === g))
  groups.forEach(g => {
    g.querySelector('.side-link')?.addEventListener('click', () => openGroup(g))
  })
  const target = a => a && document.getElementById(a.getAttribute('href').slice(1))
  const chapPairs = groups
    .map(g => [target(g.querySelector('.side-link[href^="#"]')), g])
    .filter(([t]) => t)
  const subPairs = [...document.querySelectorAll('.side-sub[href^="#"]')]
    .map(a => [target(a), a])
    .filter(([t]) => t)
  let raf = 0
  const spy = () => {
    raf = 0
    const y = scrollY + innerHeight * .33
    let curG = null
    for (const [t, g] of chapPairs) if (t.getBoundingClientRect().top + scrollY <= y) curG = g
    if (curG && !curG.classList.contains('open')) openGroup(curG)
    let curS = null
    for (const [t, a] of subPairs) if (t.getBoundingClientRect().top + scrollY <= y) curS = a
    subPairs.forEach(([, a]) => a.classList.toggle('on', a === curS && !!curS && curS.closest('.side-group') === curG))
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(spy) }, { passive: true })
  spy()
})()

/* --------------------------------------------------------------- scroll reveal */
;(() => {
  const items = document.querySelectorAll('.rv')
  if (!items.length) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'))
    return
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('in')
      obs.unobserve(e.target)          // one-way: nothing re-hides on the way back up
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: .06 })
  items.forEach(el => io.observe(el))

  // The open-source spec cells wipe in one after another. Same one-way
  // contract; the stagger lives in CSS transition-delay.
  const cells = document.querySelectorAll('.reveal-cell')
  if (cells.length) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      cells.forEach(el => el.classList.add('in'))
    } else {
      const io2 = new IntersectionObserver((entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('in')
          obs.unobserve(e.target)
        }
      }, { rootMargin: '0px 0px -10% 0px', threshold: .15 })
      cells.forEach(el => io2.observe(el))
    }
  }

  // The kinetic story block: the blockquote rises in, and its lines stagger
  // behind it. Same one-way contract; the stagger lives in CSS transition-delay.
  const kinetic = document.querySelectorAll('.kinetic')
  if (kinetic.length) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      kinetic.forEach(el => el.classList.add('in'))
    } else {
      const io3 = new IntersectionObserver((entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('in')
          obs.unobserve(e.target)
        }
      }, { rootMargin: '0px 0px -10% 0px', threshold: .15 })
      kinetic.forEach(el => io3.observe(el))
    }
  }
})()

/* ------------------------------------------------------------------ demo frame
   The demo is the whole frontend bundle. It is only worth loading when the framed
   phone is actually on screen, and never on a narrow viewport, where the CSS hides
   the frame in favour of a plain "open it full-screen" card.

   Served locally (run-local.mjs), the marketing site and the app are different
   origins on purpose: the website is :5174 and the app is :5173. Point the demo at
   the app instead of the production /demo/ path. */
;(() => {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
  const VERCEL_DEMO = 'https://ascend-jet-xi.vercel.app/'
  const app = local ? 'http://' + location.hostname + ':5173/?demo=1' : VERCEL_DEMO
  document.querySelectorAll('a[href="/demo/"]').forEach(a => { a.href = app; a.target = '_blank'; a.rel = 'noopener' })
  const slot = document.querySelector('[data-demo]')
  if (!slot) return
  slot.dataset.demo = app

  const mount = () => {
    if (slot.dataset.mounted) return
    if (!slot.offsetParent) return                 // frame hidden: phone layout
    slot.dataset.mounted = '1'
    const f = document.createElement('iframe')
    f.src = slot.dataset.demo
    f.title = 'ASCEND live demo'
    f.loading = 'lazy'
    f.style.cssText = 'width:100%;height:100%;border:0;display:block;border-radius:34px;background:#090A09'
    slot.appendChild(f)
  }

  if (!('IntersectionObserver' in window)) { mount(); return }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) if (e.isIntersecting) { mount(); obs.disconnect() }
  }, { rootMargin: '600px' })                      // load just before it scrolls into view
  io.observe(slot)
  // A rotation or a resized window can reveal the frame long after that first check.
  addEventListener('resize', mount, { passive: true })
})()

/* ---------------------------------------------------------- scroll image sequence
   Five real screens, pinned while the page scrolls. The scroll position is the only
   input: no timers, no autoplay, no hijacked wheel. The screen, the copy and the
   chapter count all derive from one progress value, so they cannot drift apart.

   The markup is complete without JS. The CSS turns the sequence into a readable stack
   when .js is missing, and every image is already in the DOM. */
;(() => {
  const track = document.getElementById('seq-track')
  if (!track) return
  const shots = [...track.querySelectorAll('.seq-shot')]
  const panels = [...track.querySelectorAll('.seq-panel')]
  const dots = [...track.querySelectorAll('.seq-dot')]
  const arrows = [...track.querySelectorAll('.seq-arrow')]
  const current = document.getElementById('seq-current')
  const ghost = document.getElementById('seq-ghost')
  const label = document.getElementById('seq-label')
  const names = ['Home', 'Workout', 'Stats', 'Plan', 'Library']
  const count = panels.length
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  let top = 0
  let span = 1
  let active = -1
  let raf = 0

  const measure = () => {
    const r = track.getBoundingClientRect()
    top = r.top + scrollY
    span = Math.max(1, track.offsetHeight - innerHeight)
  }

  const setActive = i => {
    if (i === active) return
    active = i
    panels.forEach((p, n) => {
      p.classList.toggle('is-active', n === i)
      p.setAttribute('aria-hidden', String(n !== i))
    })
    shots.forEach((s, n) => {
      s.classList.toggle('is-active', n === i)
      s.setAttribute('aria-hidden', String(n !== i))
    })
    dots.forEach((d, n) => {
      d.classList.toggle('is-active', n === i)
      if (n === i) d.setAttribute('aria-current', 'step')
      else d.removeAttribute('aria-current')
    })
    if (current) current.textContent = String(i + 1).padStart(2, '0')
    if (ghost) ghost.textContent = String(i + 1).padStart(2, '0')
    if (label) label.textContent = names[i] || ''
  }

  const render = () => {
    raf = 0
    const p = Math.min(1, Math.max(0, (scrollY - top) / span))
    // Publish the progress as a CSS variable so the drift ground, the phone
    // lean and anything else that wants to read scroll can drive off one
    // number. The panel opacity still comes from setActive, so they cannot
    // drift apart: the look and the state share a source.
    track.style.setProperty('--sc-seq-p', p.toFixed(4))
    // Sub-progress within the active panel: the phone leans into the scroll
    // and comes back through centre at each boundary, which is what makes the
    // sequence feel scrubbed rather than paginated.
    const sub = (p * count) % 1
    track.style.setProperty('--sc-seq-tilt', ((sub - .5) * 7).toFixed(2) + 'deg')
    setActive(Math.min(count - 1, Math.floor(p * count)))
  }

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(render) }

  const go = i => {
    const next = Math.min(count - 1, Math.max(0, i))
    const y = top + span * (next / (count - 1))
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' })
  }

  arrows.forEach(btn => btn.addEventListener('click', () => go((active < 0 ? 0 : active) + Number(btn.dataset.dir))))
  dots.forEach(dot => dot.addEventListener('click', () => go(Number(dot.dataset.step))))

  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', () => { measure(); render() }, { passive: true })
  addEventListener('load', () => { measure(); render() })
  measure()
  render()
})()

/* ------------------------------------------------------------------ hero parallax
   The hero stage is five planes at different scroll speeds. One rAF, one
   custom property, and only while the hero is actually on screen: a parallax
   that runs the whole page is a tax on every scroll event, and on a phone
   the planes are already hidden by the media queries. */
;(() => {
  const hero = document.querySelector('.hero')
  if (!hero) return
  const els = [
    document.querySelector('.hero-ambient'),
    document.querySelector('.hero-glow'),
    document.querySelector('.hero-orbit'),
    document.querySelector('.hero-phone'),
    ...document.querySelectorAll('.hero-float')
  ].filter(Boolean)
  if (!els.length) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  if (reduce || !fine) return

  const heroTop = () => hero.getBoundingClientRect().top + scrollY
  let raf = 0
  const set = y => {
    const p = Math.min(1, Math.max(0, (y - heroTop()) / hero.offsetHeight))
    hero.style.setProperty('--sc-h-p', p.toFixed(4))
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; set(scrollY) }) }
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll, { passive: true })
  set(scrollY)
})()

/* ---------------------------------------------------------------- reading progress
   A hairline under the top edge, only for orientation on a long page. It costs one
   style write per frame and is never the only way to know where you are. */
;(() => {
  const bar = document.getElementById('readprogress')
  if (!bar) return
  let raf = 0
  const update = () => {
    raf = 0
    const max = document.documentElement.scrollHeight - innerHeight
    bar.style.width = (max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0) + '%'
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll, { passive: true })
  update()
})()

/* ------------------------------------------------------- repo counts (nav + specs)
   Back on api.github.com since 2026-09-11. GitHub is the home of the project again and
   GitLab only mirrors it. Unauthenticated, 60 requests an hour per IP, which the
   sessionStorage cache keeps us well under.

   The cache keys carry a _gh3 suffix: a visitor with a still-warm entry from an older
   deploy would otherwise see yesterday's numbers after a release. */
;whenIdle(async () => {
  const set = (id, v) => document.querySelectorAll('[data-gh="' + id + '"]').forEach(el => { el.textContent = v })
  try {
    let d = null
    const cached = sessionStorage.getItem('repo_meta_gh3')
    if (cached) d = JSON.parse(cached)
    else {
      const r = await fetch(GH_REPO)
      if (!r.ok) return
      const j = await r.json()
      // open_issues_count counts open pull requests too. GitHub's own repo header does the
      // same, so the number matches what a visitor sees over there.
      d = { stars_count: j.stargazers_count, forks_count: j.forks_count, open_issues_count: j.open_issues_count }
      sessionStorage.setItem('repo_meta_gh3', JSON.stringify(d))
    }
    const fmt = n => Number(n).toLocaleString('en-US')
    set('stars', '★ ' + fmt(d.stars_count))
    set('stars-n', fmt(d.stars_count))
    set('forks-n', fmt(d.forks_count))
    // Leave the placeholder standing rather than writing an empty box.
    if (d.open_issues_count !== '' && d.open_issues_count != null) set('issues-n', fmt(d.open_issues_count))
  } catch (e) { /* offline / rate-limited, leave placeholders */ }
})

/* --------------------------------------------------- Discord members (nav + specs)
   Same shape as the repo counts above, and just as optional: the placeholder next to
   the Discord link is empty, so a blocked or rate-limited request leaves the link
   reading exactly as it did before anyone counted anything. */
;whenIdle(async () => {
  const set = (id, v) => document.querySelectorAll('[data-dc="' + id + '"]').forEach(el => { el.textContent = v })
  try {
    let n = null
    const cached = sessionStorage.getItem('discord_members_v2')
    if (cached) n = JSON.parse(cached)
    else {
      const r = await fetch(DC_INVITE)
      if (!r.ok) return
      const j = await r.json()
      n = j.approximate_member_count
      if (typeof n !== 'number') return
      sessionStorage.setItem('discord_members_v2', JSON.stringify(n))
    }
    // Grouped like the other four-figure numbers on the page (1,324 exercises).
    const fmt = n.toLocaleString('en-US')
    set('members', fmt)
    set('members-n', fmt)
  } catch (e) { /* offline / blocked, the link keeps its plain label */ }
})

/* -------------------------------------------------------------- about timeline
   Built from the published GitHub releases, so the page updates itself with every
   release. The static entries marked data-fallback stay in place when the API is
   unreachable; the hand-written first entry is always kept.

   Drafts and pre-releases are skipped; the notes are `body`, the date `published_at`. */
;(async () => {
  const tl = document.getElementById('milestones')
  if (!tl) return
  try {
    let rel = null
    const cached = sessionStorage.getItem('repo_releases_gh2')
    if (cached) rel = JSON.parse(cached)
    else {
      const r = await fetch(GH_REPO + '/releases?per_page=100')
      if (!r.ok) return
      rel = (await r.json()).filter(x => !x.draft && !x.prerelease)
        .map(x => ({ tag: x.tag_name, name: x.name || x.tag_name, at: x.published_at, body: x.body || '', url: x.html_url }))
      sessionStorage.setItem('repo_releases_gh2', JSON.stringify(rel))
    }
    if (!rel.length) return
    const fmt = d => new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    // first paragraph of the notes (hard-wrapped lines rejoined), markdown crudely stripped
    const blurb = md => {
      const lines = md.replace(/\r/g, '').split('\n')
      let start = lines.findIndex(l => l.trim() && !l.trim().startsWith('#'))
      if (start < 0) return ''
      let para = []
      for (let i = start; i < lines.length && lines[i].trim(); i++) para.push(lines[i].trim())
      const txt = para.join(' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>]/g, '')
      return txt.length > 220 ? txt.slice(0, 217).replace(/\s+\S*$/, '') + '…' : txt
    }
    tl.querySelectorAll('[data-fallback]').forEach(el => el.remove())
    for (const x of rel.slice().reverse()) {   // oldest → newest, matching the timeline
      const li = document.createElement('li')
      const title = x.name && x.name !== x.tag ? x.name : x.tag
      li.innerHTML = '<b></b><span class="when"></span><p></p>'
      li.querySelector('b').textContent = title.startsWith(x.tag) ? title : x.tag + ': ' + title
      li.querySelector('.when').textContent = fmt(x.at)
      const p = li.querySelector('p')
      p.textContent = blurb(x.body) + ' '
      const a = document.createElement('a')
      a.href = x.url; a.rel = 'noopener'; a.textContent = 'notes →'
      p.appendChild(a)
      tl.appendChild(li)
    }
  } catch (e) { /* fallback entries stay */ }
})()

/* The "and the rest of it" rail: arrows for pointers that cannot swipe. The cards are plain
   reading, so there is nothing to activate on them. */
;(() => {
  const rail = document.querySelector('.frail')
  if (!rail) return
  const nav = document.querySelector('.frail-nav')
  if (nav) {
    nav.hidden = false
    const [prev, next] = nav.querySelectorAll('.rnav')
    const step = () => (rail.querySelector('.fcard')?.offsetWidth || 260) + 16
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.rnav')
      if (btn) rail.scrollBy({ left: Number(btn.dataset.dir) * step(), behavior: 'smooth' })
    })
    const sync = () => {
      prev.disabled = rail.scrollLeft < 4
      next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 4
    }
    rail.addEventListener('scroll', sync, { passive: true })
    addEventListener('resize', sync)
    sync()
  }
})()

/* The first-visit curtain is armed in the inline <head> script, before the first paint.
   A deferred script would arm it too late and the page would flash. All this does is
   let a visitor skip it, and take the class off once the hero has landed, so nothing
   stays mid-animation. */
;(() => {
  const root = document.documentElement
  if (!root.classList.contains('intro')) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const finish = () => root.classList.remove('intro', 'intro-done')
  if (reduce) { finish(); return }

  // A skip is a courtesy, not a control: the curtain lifts on its own in 2.4s.
  const skip = () => {
    if (!root.classList.contains('intro')) return
    root.classList.add('intro-done')
    setTimeout(finish, 580)
  }
  document.querySelector('.intro-skip')?.addEventListener('click', skip)
  addEventListener('keydown', e => { if (e.key === 'Escape') skip() })

  const last = document.querySelector('.hero-badge') || document.querySelector('.hero-stage')
  if (last) last.addEventListener('animationend', finish, { once: true })
  setTimeout(finish, 3400)   // if the animation never fires, do not leave the hero hidden
})()

/* ------------------------------------------------------------------ local APK download
   When the site is served from localhost (run-local.mjs on :5174), the signed APK is
   also served from this origin under its versioned name. Keep the branded button label
   and force the saved filename to ASCEND.apk; the static link already works without JS. */
;(() => {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]'
  const btn = document.querySelector('.dl-row .btn[href*="ASCEND-1.4.3.apk"]')
  if (!btn) return
  if (isLocal) {
    btn.href = '/ASCEND-1.4.3.apk'
    btn.setAttribute('download', 'ASCEND.apk')
  } else {
    btn.href = 'https://github.com/jrsmDev/ASCEND/releases'
    btn.removeAttribute('download')
  }
})()

/* ------------------------------------------------------- the ascent trace
   The signature move of this build. A thin trace fixed at the bottom edge,
   present through the whole page. Scroll is the playhead: the line draws
   itself as the visitor moves, a dot rides the crest, and each chapter
   stamps a marker that stays. By the footer the trace is a complete record
   of the journey, and the markers are also navigation.

   The waveform is a climb: bottom-left to top-right with small ripples,
   deterministic so every visitor sees the same ascent. The playhead is
   lerped at a fixed fraction per frame, the way the scroll kit smooths a
   scrubbed clip — a 1:1 write would reproduce every gap in the wheel. */
;(() => {
  const root = document.getElementById('ascent-trace')
  if (!root) return
  const svg = root.querySelector('svg')
  const line = root.querySelector('.at-line')
  const fill = root.querySelector('.at-fill')
  const markersG = root.querySelector('.at-markers')
  const playhead = root.querySelector('.at-playhead')
  const NS = 'http://www.w3.org/2000/svg'
  const W = 1000, H = 48

  // The climb: y falls from ~40 (bottom) to ~12 (top) as t goes 0 → 1,
  // with three ripple frequencies so it reads as a hand-drawn ascent.
  const yAt = t => {
    const base = 40 - t * 28
    const ripple = Math.sin(t * 21) * 2.2 + Math.sin(t * 9 + 1.3) * 3.2 + Math.sin(t * 47 + .6) * 1.1
    return Math.max(5, Math.min(43, base + ripple))
  }

  // Build the path once. A 200-sample polyline is smooth at 1000 viewBox units.
  let d = ''
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    d += (i ? 'L' : 'M') + (t * W).toFixed(1) + ',' + yAt(t).toFixed(1)
  }
  line.setAttribute('d', d)
  fill.setAttribute('d', d + 'L' + W + ',' + H + 'L0,' + H + 'Z')

  // The fill is the whole area, clipped to the drawn portion by a rect that
  // grows with progress. clip-path on a path would cost a new path build
  // every frame; the rect is one attribute.
  const clip = document.createElementNS(NS, 'clipPath')
  clip.setAttribute('id', 'at-clip')
  const clipRect = document.createElementNS(NS, 'rect')
  clipRect.setAttribute('x', '0'); clipRect.setAttribute('y', '0')
  clipRect.setAttribute('width', '0'); clipRect.setAttribute('height', String(H))
  clip.appendChild(clipRect)
  svg.appendChild(clip)
  fill.setAttribute('clip-path', 'url(#at-clip)')

  const len = line.getTotalLength()
  line.style.strokeDasharray = len
  line.style.strokeDashoffset = len

  // The chapters: the hero counts as the first marker. The marker sits at the
  // playhead position where the chapter's centre crosses the viewport middle.
  const chapters = [
    { el: document.querySelector('.hero'), label: 'Start' },
    ...[...document.querySelectorAll('section[data-sc-label]')].map(s => ({ el: s, label: s.dataset.scLabel }))
  ].filter(c => c.el)

  const markerEls = []
  for (const c of chapters) {
    const g = document.createElementNS(NS, 'g')
    g.setAttribute('class', 'at-hit')
    g.setAttribute('role', 'link')
    g.setAttribute('tabindex', '0')
    const title = document.createElementNS(NS, 'title')
    title.textContent = c.label
    const dot = document.createElementNS(NS, 'circle')
    dot.setAttribute('r', '3')
    const hit = document.createElementNS(NS, 'circle')
    hit.setAttribute('r', '16')
    hit.setAttribute('fill', 'transparent')
    const go = () => c.el.scrollIntoView({ behavior: (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'), block: 'start' })
    g.addEventListener('click', go)
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } })
    g.append(title, dot, hit)
    markersG.appendChild(g)
    markerEls.push({ g, dot, hit, c })
  }

  // The current-chapter label rides just above the playhead.
  const label = document.createElementNS(NS, 'text')
  label.setAttribute('class', 'at-label')
  label.setAttribute('text-anchor', 'middle')
  svg.appendChild(label)

  let maxScroll = 1
  const layout = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight)
    for (const m of markerEls) {
      const r = m.c.el.getBoundingClientRect()
      const center = r.top + scrollY + r.height / 2 - innerHeight / 2
      const p = Math.max(0, Math.min(1, center / maxScroll))
      const x = p * W, y = yAt(p)
      m.dot.setAttribute('cx', x); m.dot.setAttribute('cy', y)
      m.hit.setAttribute('cx', x); m.hit.setAttribute('cy', y)
      m.p = p
    }
  }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  let cur = 0, target = 0, raf = 0
  const frame = () => {
    // Lerp 0.18 per frame; under reduced motion the rate is 1, which is no
    // smoothing at all — the dot simply sits where the scroll is.
    cur += (target - cur) * (reduce ? 1 : .18)
    if (Math.abs(target - cur) < .0004) { cur = target; raf = 0 }
    const x = cur * W, y = yAt(cur)
    playhead.setAttribute('cx', x); playhead.setAttribute('cy', y)
    line.style.strokeDashoffset = (len * (1 - cur)).toFixed(2)
    clipRect.setAttribute('width', (cur * W).toFixed(1))
    let curLabel = 'Start'
    for (const m of markerEls) if (m.p <= cur + .002) curLabel = m.c.label
    label.textContent = curLabel
    label.setAttribute('x', Math.max(40, Math.min(W - 40, x)))
    label.setAttribute('y', Math.max(10, y - 8))
    if (raf) requestAnimationFrame(frame)
  }
  const onScroll = () => {
    target = Math.max(0, Math.min(1, scrollY / maxScroll))
    if (!raf) raf = requestAnimationFrame(frame)
  }
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', () => { layout(); onScroll() }, { passive: true })
  addEventListener('load', () => { layout(); onScroll() })
  // Fonts and the demo frame change the page height after load; the observer
  // keeps the markers honest without a poll.
  if ('ResizeObserver' in window) new ResizeObserver(onScroll).observe(document.body)
  layout()
  onScroll()
  frame()
})()

