// @vitest-environment happy-dom

/* The showcase profile is a guest-only thing. Choosing guest mode in a browser seeds it; a
   guest with their own copy is never overwritten; and the moment that browser signs in, the
   example workouts come back out so they can never be pushed into a real account. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), setRemoteAuth: vi.fn() }))
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast }) } }))

import { DEF, useStore } from './useStore.js'
import { GUEST_DEMO_KEY } from '../lib/demo.js'

const clone = value => JSON.parse(JSON.stringify(value))
const fresh = { offline: false, pending: false, auth: false, lastError: null, lastSynced: 0, server: null }
const USER = { id: 'user-guest-demo', name: 'One' }

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ S: clone(DEF), user: null, ready: true, guestDemo: false, sync: { ...fresh }, config: null })
})
afterEach(() => {
  localStorage.clear()
  useStore.setState({ S: clone(DEF), user: null, ready: true, guestDemo: false, sync: { ...fresh }, config: null })
})

describe('the guest showcase', () => {
  it('is seeded when a browser chooses guest mode, and saved beside the guest marker', async () => {
    useStore.getState().setGuest(true)
    await vi.waitFor(() => expect(useStore.getState().guestDemo).toBe(true), { timeout: 5000 })

    const S = useStore.getState().S
    expect(S.workouts.length).toBeGreaterThan(20)
    expect(S.routines.length).toBeGreaterThan(0)
    expect(S.bodyweight.length).toBeGreaterThan(0)
    expect(S.measurements.length).toBeGreaterThan(0)
    expect(localStorage.getItem(GUEST_DEMO_KEY)).toBe('1')
    expect(localStorage.getItem('gym_guest')).toBe('1')
    expect(JSON.parse(localStorage.getItem('gym_state_v1')).workouts.length).toBe(S.workouts.length)
  })

  it('keeps the look, language and weigh-in choices the guest made before choosing the demo', async () => {
    useStore.setState({ S: { ...clone(DEF), theme: 'light', accent: 'violet', unit: 'lb', unitSet: true, weighIn: false, checkIn: false, showWeightCard: false } })
    useStore.getState().setGuest(true)
    await useStore.getState().seedGuestDemo({ force: true })

    const S = useStore.getState().S
    expect(S.theme).toBe('light')
    expect(S.accent).toBe('violet')
    expect(S.unit).toBe('lb')
    expect(S.weighIn).toBe(false)
    expect(S.checkIn).toBe(false)
    expect(S.showWeightCard).toBe(false)
    // The generator works in kg; the weight curve and goal arrive converted, not mislabelled.
    expect(S.targetW).toBeGreaterThan(160)
    expect(S.bodyweight.at(-1).w).toBeGreaterThan(150)
  })

  it('never overwrites a guest who already has a copy of their own', async () => {
    const own = { ...clone(DEF), workouts: [{ id: 'mine', d: '2026-01-01', name: 'My session', entries: [], start: 1, end: 2 }] }
    useStore.setState({ S: own })
    useStore.getState().setGuest(true)
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(useStore.getState().guestDemo).toBe(false)
    expect(useStore.getState().S.workouts.map(w => w.id)).toEqual(['mine'])
    expect(localStorage.getItem(GUEST_DEMO_KEY)).toBeNull()
  })

  it('comes back out of the copy when a real account signs in, keeping the look', async () => {
    useStore.setState({ S: { ...clone(DEF), theme: 'light', accent: 'acid' } })
    useStore.getState().setGuest(true)
    await useStore.getState().seedGuestDemo({ force: true })
    expect(useStore.getState().guestDemo).toBe(true)
    expect(useStore.getState().S.workouts.length).toBeGreaterThan(20)

    useStore.getState().setUser(USER)

    const S = useStore.getState().S
    expect(useStore.getState().user).toEqual(USER)
    expect(useStore.getState().guestDemo).toBe(false)
    expect(localStorage.getItem(GUEST_DEMO_KEY)).toBeNull()
    expect(localStorage.getItem('gym_guest')).toBeNull()
    expect(S.workouts).toEqual([])
    expect(S.routines).toEqual([])
    expect(S.bodyweight).toEqual([])
    expect(S.measurements).toEqual([])
    expect(S.exWeights).toEqual({})
    expect(S.targetW).toBeNull()
    expect(S.theme).toBe('light')
    expect(S.accent).toBe('acid')
  })

  it('stays away after a guest resets everything, until they ask for it again', async () => {
    useStore.getState().setGuest(true)
    await useStore.getState().seedGuestDemo({ force: true })
    expect(useStore.getState().guestDemo).toBe(true)

    await useStore.getState().resetEverything()

    expect(useStore.getState().guestDemo).toBe(false)
    expect(useStore.getState().S.workouts).toEqual([])
    expect(localStorage.getItem(GUEST_DEMO_KEY)).toBe('off')
  })
})
