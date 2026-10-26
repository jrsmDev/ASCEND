/* sheets/Equipment.jsx — Equipment configuration sheets
 *
 * Extracted from the monolithic sheets.jsx (lines ~758-973).
 * Contains:
 *   - BarWeightEditor    — bar type/weight picker per exercise
 *   - BarWeightSheet     — wraps BarWeightEditor as a sheet
 *   - PlateInventorySheet — manage your plate pairs
 *   - DumbbellInventorySheet — manage your dumbbell weights
 *   - BarDefaultsSheet   — default bar weights
 *   - barWeightSheet()    — imperative opener
 *   - plateInventorySheet() — imperative opener
 *   - dumbbellInventorySheet() — imperative opener
 *   - barDefaultsSheet()  — imperative opener
 */

import { useState } from 'react'
import { S, update, ui, toast } from './shared.js'
import { fmtNum, fmtPlate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import {
  usesBar, hasBarOverride, isNoBar, barTypeWeight,
  ownBarDefault, barPicks, withBarDefault, withStandardBars,
  defaultBarWeight, BAR_TYPES
} from '../lib/bar.js'
import {
  PLATE_SIZES, pairsOf, ownsPlates, withPlatePairs,
  withStandardPlates, withLoadKind, loadKindFor
} from '../lib/plates.js'
import {
  ownedWeightsFor, ownsDumbbells, withDumbbells,
  presetWeights, cleanWeights
} from '../lib/dumbbells.js'
import { Button, Switch, Row, Segmented } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// ─── PlateInventorySheet ────────────────────────────────────────────
function PlateInventorySheet({ close }) {
  const st = S()
  const unit = st.unit || 'kg'

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{t('plateInventory')}</div>
      <div style={{ color: 'var(--label-2)', fontSize: 14, marginBottom: 16 }}>
        {t('plateInventoryDesc')}
      </div>
      {PLATE_SIZES[unit].map(size => {
        const pairs = pairsOf(st, size, unit)
        return (
          <Row key={size} label={`${fmtPlate(size)} ${unit}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="ghost" size="sm"
                onClick={() => update(s => { s.plates = withPlatePairs(s, size, Math.max(0, pairs - 1), unit) })}>
                −
              </Button>
              <span style={{ minWidth: 24, textAlign: 'center' }}>{pairs}</span>
              <Button variant="ghost" size="sm"
                onClick={() => update(s => { s.plates = withPlatePairs(s, size, pairs + 1, unit) })}>
                +
              </Button>
            </div>
          </Row>
        )
      })}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button variant="ghost" onClick={() => {
          update(s => { s.plates = withStandardPlates(s, unit) })
          toast(t('reset'))
        }}>{t('resetToDefault')}</Button>
        <Button onClick={close}>{t('done')}</Button>
      </div>
    </div>
  )
}

export const plateInventorySheet = () =>
  ui().openSheet(close => <PlateInventorySheet close={close} />)

// ─── DumbbellInventorySheet ─────────────────────────────────────────
function DumbbellInventorySheet({ close }) {
  const st = S()
  const unit = st.unit || 'kg'
  const owned = ownedWeightsFor(st, unit)

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{t('dumbbellInventory')}</div>
      <div style={{ color: 'var(--label-2)', fontSize: 14, marginBottom: 16 }}>
        {t('dumbbellInventoryDesc')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {presetWeights(unit).map(w => {
          const has = owned.includes(w)
          return (
            <button
              key={w}
              onClick={() => update(s => {
                const weights = ownedWeightsFor(s, unit)
                s.dumbbells = withDumbbells(s,
                  has ? weights.filter(x => x !== w) : [...weights, w].sort((a, b) => a - b),
                  unit
                )
              })}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 14,
                border: `1px solid ${has ? 'var(--acc-text)' : 'var(--sep)'}`,
                background: has ? 'var(--acc-soft)' : 'transparent',
                color: has ? 'var(--acc-text)' : 'var(--label-2)',
                cursor: 'pointer',
              }}
            >
              {fmtNum(w)}
            </button>
          )
        })}
      </div>
      <Button onClick={close}>{t('done')}</Button>
    </div>
  )
}

export const dumbbellInventorySheet = () =>
  ui().openSheet(close => <DumbbellInventorySheet close={close} />)

// ─── BarDefaultsSheet ───────────────────────────────────────────────
function BarDefaultsSheet({ close }) {
  const st = S()
  const unit = st.unit || 'kg'

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{t('barDefaults')}</div>
      {BAR_TYPES.map(type => {
        const w = ownBarDefault(st, type, unit) ?? defaultBarWeight(type, unit)
        return (
          <Row key={type} label={t(`bar_${type}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="ghost" size="sm"
                onClick={() => update(s => { s.bars = withBarDefault(s, type, Math.max(0, w - (unit === 'lb' ? 5 : 2.5)), unit) })}>
                −
              </Button>
              <span style={{ minWidth: 40, textAlign: 'center' }}>{fmtNum(w)} {unit}</span>
              <Button variant="ghost" size="sm"
                onClick={() => update(s => { s.bars = withBarDefault(s, type, w + (unit === 'lb' ? 5 : 2.5), unit) })}>
                +
              </Button>
            </div>
          </Row>
        )
      })}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button variant="ghost" onClick={() => {
          update(s => { s.bars = withStandardBars(s, unit) })
          toast(t('reset'))
        }}>{t('resetToDefault')}</Button>
        <Button onClick={close}>{t('done')}</Button>
      </div>
    </div>
  )
}

export const barDefaultsSheet = () =>
  ui().openSheet(close => <BarDefaultsSheet close={close} />)

// ─── BarWeightSheet ─────────────────────────────────────────────────
function BarWeightSheet({ exId, cfg, close }) {
  return (
    <div>
      <BarWeightEditor ex={{ id: exId }} cfg={cfg} />
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button onClick={close}>{t('done')}</Button>
      </div>
    </div>
  )
}

function BarWeightEditor({ ex, cfg }) {
  const st = S()
  const unit = st.unit || 'kg'
  const picks = barPicks(unit)

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{t('barWeight')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {picks.map(p => (
          <button
            key={p.type + p.weight}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
              border: '1px solid var(--sep)',
              background: 'var(--surface)',
              color: 'var(--label)',
            }}
          >
            {t(`bar_${p.type}`)} · {fmtNum(p.weight)} {unit}
          </button>
        ))}
      </div>
    </div>
  )
}

export const barWeightSheet = (exId, cfg) =>
  ui().openSheet(close => <BarWeightSheet exId={exId} cfg={cfg} close={close} />)
