import { useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import { MONO } from '../drop/theme'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card, { CardBody, CardHeader } from '../ui/Card'
import Icon from '../ui/Icon'
import Input from '../ui/Input'
import { LoadingBlock } from '../ui/Spinner'

const MIN_SHARE = 0
const MAX_SHARE = 20

/** The two fixed services, in the order the API names them. */
const WORKERS = [
  { key: 'personal', field: 'personal_share', fallbackName: 'Personal project' },
  { key: 'company', field: 'company_share', fallbackName: 'Company project' },
]

/** The typed share when it is a whole number from 0 to 20, else null. */
function parseShare(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const n = Number(text)
  return n >= MIN_SHARE && n <= MAX_SHARE ? n : null
}

const workerOf = (state, key) =>
  (Array.isArray(state?.workers) ? state.workers : []).find((worker) => worker.key === key)

const isConfigured = (state, key) => workerOf(state, key)?.configured !== false

/** Share numbers are kept as last saved, even while one project takes every video. */
const sharesOf = (state) =>
  Object.fromEntries(WORKERS.map(({ key, field }) => [key, String(Number(state?.[field]) || 0)]))

/** Who receives videos: one project for all of them, or the repeating split. */
const MODES = [
  { key: 'personal', label: 'Personal project', summary: 'Every video uses the personal project.' },
  { key: 'company', label: 'Company project', summary: 'Every video uses the company project.' },
  { key: 'both', label: 'Both' },
]

/**
 * The saved mode. Older saves have no `mode`: a share of 0 on one side means
 * every video goes to the other project (5 and 0 reads as personal).
 */
function modeOf(state) {
  if (MODES.some((m) => m.key === state?.mode)) return state.mode
  const personal = Number(state?.personal_share) || 0
  const company = Number(state?.company_share) || 0
  if (personal > 0 && company === 0) return 'personal'
  if (company > 0 && personal === 0) return 'company'
  return 'both'
}

/** A choice is available only when every worker it sends videos to is configured. */
const modeAvailable = (state, mode) =>
  mode === 'both' ? WORKERS.every(({ key }) => isConfigured(state, key)) : isConfigured(state, mode)

/**
 * Super Admin: which evaluator service runs video AI analysis — the personal
 * project, the company project, or both (N videos to one, M to the other,
 * repeating).
 * GitHub AI evaluation is not affected, and jobs already queued keep the
 * service they were given. The service URLs are fixed and shown read-only.
 *
 * Written without try/finally so the React Compiler can optimise it.
 */
export default function EvaluationRoutingPanel() {
  const [state, setState] = useState(null)
  const [mode, setMode] = useState('both')
  const [shares, setShares] = useState({ personal: '0', company: '0' })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  const apply = (payload) => {
    setState(payload)
    setMode(modeOf(payload))
    setShares(sharesOf(payload))
  }

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    adminApi
      .getEvaluationRouting({ signal: controller.signal })
      .then((payload) => {
        if (!active) return
        apply(payload)
        setLoading(false)
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return
        setLoadError(error?.message || 'Unable to load the video analysis split.')
        setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const isBoth = mode === 'both'
  const savedMode = modeOf(state)
  const parsed = Object.fromEntries(WORKERS.map(({ key }) => [key, parseShare(shares[key])]))
  const allValid = WORKERS.every(({ key }) => parsed[key] !== null)
  // Both projects must receive at least one video each when the split is used.
  const allPositive = WORKERS.every(({ key }) => parsed[key] > 0)
  const saved = sharesOf(state)
  const sharesChanged = WORKERS.some(({ key }) => parsed[key] !== Number(saved[key]))
  const dirty = mode !== savedMode || (isBoth && sharesChanged)
  const canSave = isBoth ? allValid && allPositive : modeAvailable(state, mode)

  const clearMessages = () => {
    setSaveError('')
    setSaveMessage('')
  }

  const update = (key) => (event) => {
    setShares((current) => ({ ...current, [key]: event.target.value }))
    clearMessages()
  }

  const choose = (next) => {
    setMode(next)
    // The split needs at least one video on each side, so a 0 becomes 1.
    if (next === 'both') {
      setShares((current) =>
        Object.fromEntries(
          WORKERS.map(({ key }) => [key, parseShare(current[key]) === 0 ? '1' : current[key]]),
        ),
      )
    }
    clearMessages()
  }

  const save = async () => {
    setSaving(true)
    clearMessages()
    // Always send both shares; while one project is chosen they keep their
    // last values (hidden inputs fall back to the saved numbers).
    const body = {
      mode,
      ...Object.fromEntries(WORKERS.map(({ key, field }) => [field, parsed[key] ?? Number(saved[key])])),
    }
    const payload = await adminApi.updateEvaluationRouting(body).catch((error) => {
      // A 400 carries the reason in `detail`, which the client surfaces as the message.
      setSaveError(error?.message || 'Unable to save the video analysis split.')
      return null
    })
    setSaving(false)
    if (!payload) return
    apply(payload)
    setSaveMessage('Saved. The next video starts from the beginning of the pattern.')
  }

  const sequence = Array.isArray(state?.sequence) ? state.sequence : []
  const nextIndex = sequence.length ? (Number(state?.next_index) || 0) % sequence.length : -1
  const nameOf = (key) =>
    workerOf(state, key)?.name || WORKERS.find((w) => w.key === key)?.fallbackName || key

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div>
          <h3>Video AI analysis split</h3>
          <p className="text-sm text-muted">
            {state?.scope || 'Video AI analysis. GitHub AI evaluation stays on this API.'}
          </p>
        </div>
        <Icon name="sparkles" size={20} className="text-muted" />
      </CardHeader>
      <CardBody>
        {loading ? (
          <LoadingBlock label="Loading video analysis split…" />
        ) : loadError ? (
          <Alert variant="danger" title="Unable to load the video analysis split">
            {loadError}
          </Alert>
        ) : (
          <div className="stack-md">
            {saveError && <Alert variant="danger">{saveError}</Alert>}
            {saveMessage && <Alert variant="success">{saveMessage}</Alert>}

            <fieldset className="min-w-0">
              <legend className="mb-2 text-[12.5px] text-muted">Which project analyses videos</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
                {MODES.map((option) => {
                  const available = modeAvailable(state, option.key)
                  const active = mode === option.key
                  return (
                    <label
                      key={option.key}
                      className={`flex items-center gap-2.5 rounded-drop border p-3 text-[13.5px] ${
                        active
                          ? 'border-volt-edge bg-volt-tint font-semibold text-ink'
                          : 'border-hairline text-ink'
                      } ${available && !saving ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      title={available ? undefined : 'This service is not configured.'}
                    >
                      <input
                        type="radio"
                        name="evaluation-routing-mode"
                        value={option.key}
                        checked={active}
                        disabled={!available || saving}
                        onChange={() => choose(option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {isBoth ? (
              savedMode === 'both' &&
              state?.summary && <p className="text-[13.5px] text-ink">{state.summary}</p>
            ) : (
              <p className="text-[13.5px] text-ink">{MODES.find((m) => m.key === mode)?.summary}</p>
            )}

            {isBoth && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {WORKERS.map(({ key }) => {
                  const worker = workerOf(state, key)
                  const configured = isConfigured(state, key)
                  const value = shares[key]
                  const invalid = value !== '' && parsed[key] === null
                  return (
                    <div key={key} className="min-w-0 rounded-drop border border-hairline p-3.5">
                      <Input
                        label={`${nameOf(key)} — videos per cycle`}
                        type="number"
                        inputMode="numeric"
                        min={MIN_SHARE}
                        max={MAX_SHARE}
                        step={1}
                        value={value}
                        disabled={!configured || saving}
                        onChange={update(key)}
                        error={invalid ? `A whole number from ${MIN_SHARE} to ${MAX_SHARE}` : undefined}
                      />
                      {worker?.project_id && (
                        <p
                          className={`${MONO} mt-2 truncate text-[12px] text-muted`}
                          title={worker.project_id}
                        >
                          {worker.project_id}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {isBoth && savedMode === 'both' && sequence.length > 0 && (
              <div>
                <p className="mb-2 text-[12.5px] text-muted">Repeating order</p>
                <ol className="flex flex-wrap gap-1.5" aria-label="Repeating order of services">
                  {sequence.map((key, index) => {
                    const next = index === nextIndex
                    return (
                      <li
                        key={index}
                        className={`rounded-full border px-2.5 py-1 text-[12.5px] ${
                          next
                            ? 'border-volt-edge bg-volt-tint font-semibold text-ink'
                            : 'border-hairline text-muted'
                        }`}
                        aria-current={next ? 'step' : undefined}
                      >
                        {index + 1}. {nameOf(key)}
                        {next ? ' · next' : ''}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12.5px] text-muted">
                {isBoth && allValid && !allPositive
                  ? 'Set how many videos each project receives, or choose one project.'
                  : 'Saving restarts the pattern from the first video. Jobs already queued keep their service.'}
              </p>
              <Button
                variant="accent"
                loading={saving}
                disabled={!dirty || !canSave || saving}
                onClick={save}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
