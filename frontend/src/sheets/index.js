/* sheets/index.js — Barrel export for ASCEND modular sheets
 *
 * This barrel provides a single, unified entry point for all sheet components,
 * whether they have already been extracted into focused sub-modules or remain
 * in the legacy sheets.jsx during incremental migration.
 *
 * Submodules:
 *   - shared.js      — store accessors, toast, snd helpers
 *   - BodyWeight.jsx — weigh-in, bodyweight goal, and history sheets
 *   - Equipment.jsx  — plate inventory, dumbbells, bar weights and defaults
 */

export * from './shared.js'
export * from './BodyWeight.jsx'
export * from './Equipment.jsx'
export * from '../sheets.jsx'
