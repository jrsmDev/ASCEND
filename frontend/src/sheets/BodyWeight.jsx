/* sheets/BodyWeight.jsx — Body weight input, weigh-in history, and goal sheets
 *
 * Extracted from the monolithic sheets.jsx (lines ~259-418).
 * Contains:
 *   - WeightInput      — reusable numeric weight input with stepper
 *   - BwSheet          — body weight entry sheet (used on check-in)
 *   - WeighIns          — weigh-in history list
 *   - GoalSheet         — set a body weight goal
 *   - bwSheet()         — imperative opener
 *   - weighInsSheet()   — imperative opener
 *   - goalSheet()       — imperative opener
 *   - bwDeltaColor()    — color helper for weight delta display
 */

import { useRef, useState } from 'react'
import { S, update, ui, toast } from './shared.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { lastBW } from '../lib/history.js'
import { weeklyWeights, logWeighIn } from '../lib/bodyweight.js'
import { Button, NumberField } from '../components/ui.jsx'
import Stepper from '../components/Stepper.jsx'
import Icon from '../components/Icon.jsx'

// ─── Constants ──────────────────────────────────────────────────────
const W_LO = 1
const wHi = unit => (unit === 'lb' ? 660 : 300)
const BW_STEP = 0.1
const bwMax = unit => (unit === 'lb' ? 1500 : 700)
const bwTooHeavy = (n, unit) => {
  const max = bwMax(unit)
  return n > max ? t('maxValue', { max: fmtNum(max) }) : null
}

// ─── WeightInput ────────────────────────────────────────────────────
export function WeightInput({ value, setValue, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
      <Stepper
        value={value}
        onChange={setValue}
        step={BW_STEP}
        min={W_LO}
        max={wHi(unit)}
        unit={unit}
        size="large"
      />
    </div>
  )
}

// ─── BwSheet ────────────────────────────────────────────────────────
function BwSheet({ required, onDone, close }) {
  const st = S()
  const unit = st.unit || 'kg'
  const last = lastBW(st)
  const [v, setV] = useState(last || (unit === 'lb' ? 154 : 70))

  const save = () => {
    const warn = bwTooHeavy(v, unit)
    if (warn) { toast(warn); return }
    logWeighIn(v, todayISO(), update, S)
    toast(t('saved'))
    close()
    if (onDone) onDone(v)
  }

  return (
    <div style={{ padding: '8px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 15, color: 'var(--label-2)', marginBottom: 16 }}>
        {t('bodyWeight')} ({unit})
      </div>
      <WeightInput value={v} setValue={setV} unit={unit} />
      <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' }}>
        {!required && (
          <Button variant="ghost" onClick={close}>{t('cancel')}</Button>
        )}
        <Button onClick={save}>{t('save')}</Button>
      </div>
    </div>
  )
}

export function bwSheet(opts = {}) {
  ui().openSheet(close => <BwSheet {...opts} close={close} />)
}

// ─── WeighIns (history) ─────────────────────────────────────────────
function WeighInRow({ b, unit, confirm = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ color: 'var(--label-2)', fontSize: 14 }}>{fmtDate(b.d)}</span>
      <span style={{ fontWeight: 500 }}>{fmtNum(b.v)} {unit}</span>
    </div>
  )
}

function WeighIns({ close }) {
  const st = S()
  const unit = st.unit || 'kg'
  const weights = weeklyWeights(st)

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{t('weighIns')}</div>
      {weights.length === 0 ? (
        <div style={{ color: 'var(--label-3)', textAlign: 'center', padding: 24 }}>
          {t('noWeighIns')}
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          {weights.slice().reverse().map(b => (
            <WeighInRow key={b.d} b={b} unit={unit} />
          ))}
        </div>
      )}
    </div>
  )
}

export const weighInsSheet = () => ui().openSheet(close => <WeighIns close={close} />)

// ─── GoalSheet ──────────────────────────────────────────────────────
function GoalSheet({ close }) {
  const st = S()
  const unit = st.unit || 'kg'
  const [goal, setGoal] = useState(st.bwGoal || '')

  const save = () => {
    const n = Number(goal)
    if (goal !== '' && (isNaN(n) || n <= 0)) { toast(t('invalidValue')); return }
    update(s => { s.bwGoal = goal === '' ? null : n })
    toast(t('saved'))
    close()
  }

  return (
    <div style={{ padding: '8px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{t('goalWeight')}</div>
      <NumberField
        value={goal}
        onChange={setGoal}
        placeholder={`${t('goalWeight')} (${unit})`}
        style={{ textAlign: 'center', fontSize: 24, maxWidth: 160, margin: '0 auto' }}
      />
      <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button variant="ghost" onClick={close}>{t('cancel')}</Button>
        <Button onClick={save}>{t('save')}</Button>
      </div>
    </div>
  )
}

export const goalSheet = () => ui().openSheet(close => <GoalSheet close={close} />)

// ─── Helpers ────────────────────────────────────────────────────────
export function bwDeltaColor(delta, currentW) {
  if (!delta || !currentW) return 'var(--label-2)'
  // Green for losing when above goal, red for gaining when above goal, etc.
  return delta > 0 ? 'var(--chart-red)' : 'var(--chart-green)'
}
