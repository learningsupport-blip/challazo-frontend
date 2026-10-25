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

/** A worker the API reports as not configured must stay at 0. */
const workerOf = (state, key) =>
  (Array.isArray(state?.workers) ? state.workers : []).find((worker) => worker.key === key)

const isConfigured = (state, key) => workerOf(state, key)?.configured !== false

const sharesOf = (state) =>
  Object.fromEntries(
    WORKERS.map(({ key, field }) => [key, isConfigured(state, key) ? String(Number(state?.[field]) || 0) : '0']),
  )

/**
 * Super Admin: how video AI analysis is split between the personal and the
 * company evaluator service. N videos go to one, M to the other, repeating.
 * GitHub AI evaluation is not affected, and jobs already queued keep the
 * service they were given. The service URLs are fixed and shown read-only.
 *
 * Written without try/finally so the React Compiler can optimise it.
 */
export default function EvaluationRoutingPanel() {
  const [state, setState] = useState(null)
  const [shares, setShares] = useState({ personal: '0', company: '0' })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  const apply = (payload) => {
    setState(payload)
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

  const parsed = Object.fromEntries(WORKERS.map(({ key }) => [key, parseShare(shares[key])]))
  const allValid = WORKERS.every(({ key }) => parsed[key] !== null)
  const anyPositive = WORKERS.some(({ key }) => parsed[key] > 0)
  const saved = sharesOf(state)
  const dirty = WORKERS.some(({ key }) => parsed[key] !== Number(saved[key]))

  const update = (key) => (event) => {
    setShares((current) => ({ ...current, [key]: event.target.value }))
    setSaveError('')
    setSaveMessage('')
  }

  const save = async () => {
    setSaving(true)
    setSaveError('')
    setSaveMessage('')
    const body = Object.fromEntries(WORKERS.map(({ key, field }) => [field, parsed[key]]))
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

            {state?.summary && <p className="text-[13.5px] text-ink">{state.summary}</p>}

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
                      value={configured ? value : '0'}
                      disabled={!configured || saving}
                      onChange={update(key)}
                      error={invalid ? `A whole number from ${MIN_SHARE} to ${MAX_SHARE}` : undefined}
                      hint={configured ? undefined : 'This service is not configured, so it stays at 0.'}
                    />
                    {worker?.project_id && (
                      <p className={`${MONO} mt-2 truncate text-[12px] text-muted`} title={worker.project_id}>
                        {worker.project_id}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {sequence.length > 0 && (
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
                {!anyPositive && allValid
                  ? 'At least one service needs more than 0 videos.'
                  : 'Saving restarts the pattern from the first video. Jobs already queued keep their service.'}
              </p>
              <Button
                variant="accent"
                loading={saving}
                disabled={!dirty || !allValid || !anyPositive || saving}
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
