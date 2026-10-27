import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const section = document.querySelector('.card-story-section')
const cards = [...document.querySelectorAll('[data-story-card]')]
const progress = document.querySelector('[data-card-story-progress]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const setCardFace = (card, showBack) => {
  const front = card.querySelector('.story-card-front')
  const back = card.querySelector('.story-card-back')
  front?.setAttribute('aria-hidden', String(showBack))
  back?.setAttribute('aria-hidden', String(!showBack))
}

if (section && cards.length === 4) {
  const buttons = cards.map(card => card.querySelector('.story-card-toggle'))

  cards.forEach((card, index) => {
    const button = buttons[index]
    const label = card.querySelector('.story-card-kicker')?.textContent?.split('/')[1]?.trim() || 'card'
    setCardFace(card, false)
    button?.addEventListener('click', () => {
      if (reduceMotion.matches) return
      const flipped = !card.classList.contains('is-flipped')
      card.classList.toggle('is-flipped', flipped)
      button.setAttribute('aria-expanded', String(flipped))
      button.textContent = flipped ? `Show ${label} screenshot` : `Open ${label} details`
      setCardFace(card, flipped)
    })
  })

  const syncReducedMotionAccessibility = () => {
    cards.forEach((card, index) => {
      const button = buttons[index]
      if (reduceMotion.matches) {
        card.classList.remove('is-flipped')
        button?.setAttribute('aria-expanded', 'false')
        if (button) button.textContent = `Open ${card.querySelector('.story-card-kicker')?.textContent?.split('/')[1]?.trim() || 'card'} details`
        card.querySelector('.story-card-front')?.removeAttribute('aria-hidden')
        card.querySelector('.story-card-back')?.removeAttribute('aria-hidden')
      } else {
        setCardFace(card, card.classList.contains('is-flipped'))
      }
    })
  }
  syncReducedMotionAccessibility()
  reduceMotion.addEventListener('change', syncReducedMotionAccessibility)

  const scrollStory = gsap.matchMedia()
  scrollStory.add(
    '(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    () => {
      const cardContent = cards.map(card => [
        ...card.querySelector('.story-card-front').children
      ])
      section.classList.add('is-scroll-story')
      cards.forEach((card, index) => {
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: index * 11,
          y: index * 8,
          rotation: index * -1.5,
          zIndex: cards.length - index
        })
      })
      cardContent.forEach((content, index) => {
        gsap.set(content, { opacity: index === 0 ? 1 : 0 })
      })

      const spreadDuration = 1
      const flipDuration = 0.75
      const flipStagger = 0.4
      const totalDuration = 3
      const centers = [14, 38, 62, 86]
      const fanAngles = [-15, -7.5, 7.5, 15]
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * totalDuration}`,
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      })

      timeline.addLabel('spread', 0)
      cards.forEach((card, index) => {
        timeline.to(card, {
          x: () => window.innerWidth * centers[index] / 100 - (
            section.getBoundingClientRect().left + section.clientWidth / 2
          ),
          y: 0,
          rotation: fanAngles[index],
          duration: spreadDuration
        }, 'spread')
      })

      cardContent.slice(1).forEach((content, index) => {
        timeline.to(content, {
          opacity: 1,
          duration: 0.18
        }, 0.55 + index * 0.12)
      })

      timeline.addLabel('flip', spreadDuration)
      cards.forEach((card, index) => {
        const inner = card.querySelector('.story-card-inner')
        const flipAt = spreadDuration + flipStagger * index
        timeline.to(card, { rotation: 0, duration: flipDuration }, flipAt)
        timeline.to(inner, {
          rotationY: 180,
          duration: flipDuration,
          onUpdate: () => {
            const flipped = Number.parseFloat(gsap.getProperty(inner, 'rotationY')) >= 90
            setCardFace(card, flipped)
          }
        }, flipAt)
      })
      timeline.addLabel('settled', totalDuration)

      if (progress) {
        gsap.set(progress, { scaleX: 0 })
        timeline.to(progress, { scaleX: 1, duration: totalDuration }, 0)
      }

      return () => {
        section.classList.remove('is-scroll-story')
        cards.forEach(card => {
          if (reduceMotion.matches) {
            card.querySelector('.story-card-front')?.removeAttribute('aria-hidden')
            card.querySelector('.story-card-back')?.removeAttribute('aria-hidden')
          } else {
            setCardFace(card, false)
          }
        })
      }
    }
  )

  const refresh = () => ScrollTrigger.refresh()
  if (document.readyState === 'complete') refresh()
  else window.addEventListener('load', refresh, { once: true })
  document.fonts?.ready.then(refresh)
}
