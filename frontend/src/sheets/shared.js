/* sheets/shared.js — Shared utilities for all sheet components
 *
 * These helpers are used across every sheet module. They provide store access,
 * toast notifications, and common UI patterns (confirm dialogs, menu sheets).
 *
 * This file exists so that individual sheet modules can import from one place
 * instead of each independently importing useStore, useUI, and re-declaring
 * the same accessor shortcuts.
 */

import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'

// ─── Store accessors ────────────────────────────────────────────────
/** Get the current user state (S = the user's plan, workouts, settings) */
export const S = () => useStore.getState().S

/** Dispatch an update to the store */
export const update = (...a) => useStore.getState().update(...a)

/** Get the UI store state */
export const ui = () => useUI.getState()

/** Show a toast message */
export const toast = m => ui().toast(m)

/** Get the user's sound preference */
export const snd = () => S().sound

// ─── Re-exports for convenience ─────────────────────────────────────
export { useStore, useUI }
