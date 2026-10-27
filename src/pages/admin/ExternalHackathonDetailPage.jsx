import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, useParams } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import { externalHackathonsAdminApi } from '../../api/externalHackathons'
import ExternalHackathonFormModal from '../../components/admin/ExternalHackathonFormModal'
import ExternalHackathonLinkPanel, {
  ExternalStatusBadge,
} from '../../components/admin/ExternalHackathonLinkPanel'
import { WRAP_APP } from '../../components/drop/theme'
import ScorecardBar from '../../components/evaluation/ScorecardBar'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/ui/Alert'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card, { CardBody, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { LoadingBlock } from '../../components/ui/Spinner'
import { modalAnalysisDetail } from '../../components/ui/uiClasses'
import { useAuth } from '../../hooks/useAuth'
import { useAsync } from '../../hooks/useAsync'
import { adminPath } from '../../utils/access'
import { formatDateTime, formatScore } from '../../utils/format'

const POLL_MS = 4000

const listOf = (data, key) =>
  Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : Array.isArray(data?.items) ? data.items : []

const isRunning = (row) => row?.status === 'processing'

function themeName(row, themes) {
  if (row?.theme_name) return row.theme_name
  if (row?.theme && typeof row.theme === 'object') return row.theme.name
  if (typeof row?.theme === 'string') return row.theme
  return themes.find((theme) => theme.id === row?.theme_id)?.name || '—'
}

function FieldScores({ scores }) {
  if (!scores?.length) return null
  return (
    <div className="table-wrap">
      <table className="field-scores-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Score</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((item) => (
            <tr key={item.field_key || item.field_label}>
              <td>
                <strong>{item.field_label || item.field_key}</strong>
              </td>
              <td className="mono">
                {item.skipped ? '—' : `${Number(item.score ?? 0).toFixed(1)} / ${Number(item.max_score ?? 10)}`}
              </td>
              <td className="field-scores-rationale">{item.rationale || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Problem, solution, video and the AI analysis for one submission. */
function SubmissionDetailModal({ row, themes, onClose }) {
  const evaluation = row?.evaluation
  const error = evaluation?.error || row?.error
  return (
    <Modal open={!!row} onClose={onClose} title={row?.team_name || 'Submission'} className={modalAnalysisDetail}>
      {row && (
        <div className="stack-md">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <StatusBadge status={row.status} />
            <span>Theme: {themeName(row, themes)}</span>
            {row.external_team_id && <span>· Team ID {row.external_team_id}</span>}
            {row.leader_name && <span>· Leader {row.leader_name}</span>}
          </div>
          {row.video_url && (
            <video src={row.video_url} controls preload="metadata" className="w-full rounded-drop bg-black" />
          )}
          <div>
            <h4 className="label">Problem statement</h4>
            <p className="whitespace-pre-wrap text-ink">{row.problem_statement || '—'}</p>
          </div>
          <div>
            <h4 className="label">Solution description</h4>
            <p className="whitespace-pre-wrap text-ink">{row.solution_description || '—'}</p>
          </div>

          <h3 className="text-lg font-semibold text-ink">AI analysis</h3>
          {error ? (
            <Alert variant="danger" title="Analysis failed">
              {error}
            </Alert>
          ) : !evaluation ? (
            <p className="text-sm text-muted">
              {isRunning(row) ? 'Analysis is running…' : 'AI analysis has not been run yet.'}
            </p>
          ) : (
            <>
              {evaluation.score != null && (
                <p className="text-ink">
                  AI score: <strong>{formatScore(evaluation.score)}</strong>
                </p>
              )}
              {evaluation.scorecard?.metrics?.length > 0 && (
                <ScorecardBar scorecard={evaluation.scorecard} title="Scorecard" />
              )}
              <FieldScores scores={evaluation.field_scores} />
              {evaluation.report && (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{evaluation.report}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

/**
 * One external hackathon: publish / close, the form link for the source
 * platform, and its submissions with assignment and AI analysis.
 */
export default function ExternalHackathonDetailPage() {
  const { hackathonId } = useParams()
  const { user } = useAuth()
  const { data: hackathon, loading, error, setData: setHackathon } = useAsync(() =>
    externalHackathonsAdminApi.get(hackathonId),
  )
  const {
    data: submissionsData,
    loading: submissionsLoading,
    error: submissionsError,
    setData: setSubmissions,
  } = useAsync(() => externalHackathonsAdminApi.submissions(hackathonId))
  const { data: evaluatorsData } = useAsync(() => adminApi.getApprovedEvaluators())

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [rowBusy, setRowBusy] = useState({})
  const [viewing, setViewing] = useState(null)

  const submissions = listOf(submissionsData, 'submissions')
  const evaluators = listOf(evaluatorsData, 'evaluators')
  const themes = Array.isArray(hackathon?.themes) ? hackathon.themes : []
  const anyRunning = submissions.some(isRunning)

  // Poll while any analysis is running, until every row is completed or failed.
  useEffect(() => {
    if (!anyRunning) return undefined
    const timer = setInterval(() => {
      externalHackathonsAdminApi
        .submissions(hackathonId)
        .then(setSubmissions)
        .catch(() => {})
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [anyRunning, hackathonId, setSubmissions])

  const replaceRow = (id, patch) =>
    setSubmissions((current) => {
      const rows = listOf(current, 'submissions').map((row) => (row.id === id ? { ...row, ...patch } : row))
      return Array.isArray(current) ? rows : { ...current, submissions: rows, items: rows }
    })

  const runAction = async (key, call, message) => {
    setBusy(key)
    setActionError('')
    setActionMessage('')
    try {
      const saved = await call()
      if (saved && typeof saved === 'object') setHackathon((current) => ({ ...current, ...saved }))
      setActionMessage(message)
    } catch (err) {
      setActionError(err.message || 'That did not work. Please try again.')
    } finally {
      setBusy('')
    }
  }

  const assign = async (row, evaluatorId) => {
    if (!evaluatorId) return
    setRowBusy((current) => ({ ...current, [row.id]: 'assign' }))
    setActionError('')
    try {
      const saved = await externalHackathonsAdminApi.assign(row.id, evaluatorId)
      replaceRow(row.id, {
        ...(saved && typeof saved === 'object' ? saved : {}),
        assigned_evaluator_id: evaluatorId,
        assigned_evaluator_name:
          saved?.assigned_evaluator_name || evaluators.find((item) => item.id === evaluatorId)?.name,
      })
    } catch (err) {
      setActionError(err.message || 'Unable to assign the evaluator.')
    } finally {
      setRowBusy((current) => ({ ...current, [row.id]: '' }))
    }
  }

  const evaluate = async (row) => {
    setRowBusy((current) => ({ ...current, [row.id]: 'evaluate' }))
    setActionError('')
    try {
      await externalHackathonsAdminApi.evaluate(row.id)
      replaceRow(row.id, { status: 'processing', error: null })
    } catch (err) {
      // 409 ALREADY_PROCESSING: it is running already, so keep polling it.
      if (err.code === 'ALREADY_PROCESSING') replaceRow(row.id, { status: 'processing' })
      setActionError(err.message || 'Unable to start AI analysis.')
    } finally {
      setRowBusy((current) => ({ ...current, [row.id]: '' }))
    }
  }

  if (loading && !hackathon) {
    return (
      <div className={`${WRAP_APP} py-7 md:py-10`}>
        <LoadingBlock label="Loading external hackathon…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${WRAP_APP} py-7 md:py-10`}>
        <Alert variant="danger" title="Unable to load this external hackathon">
          {error.message}
        </Alert>
      </div>
    )
  }

  const status = hackathon?.status
  const viewingRow = viewing ? submissions.find((row) => row.id === viewing) : null

  return (
    <div className={`${WRAP_APP} py-7 md:py-10`}>
      <Link
        to={adminPath('/admin/external-hackathons', user)}
        className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] text-muted hover:text-ink"
      >
        <Icon name="arrowLeft" size={15} /> External hackathons
      </Link>
      <PageHeader
        eyebrow={hackathon?.source_platform ? `External · ${hackathon.source_platform}` : 'External hackathon'}
        title={hackathon?.name}
        description={hackathon?.description}
        actions={
          <>
            <ExternalStatusBadge status={status} />
            <Button variant="secondary" onClick={() => setEditing(true)} leftIcon={<Icon name="edit" size={16} />}>
              Edit
            </Button>
            {status === 'draft' && (
              <Button
                variant="accent"
                loading={busy === 'publish'}
                disabled={!!busy}
                onClick={() =>
                  runAction(
                    'publish',
                    () => externalHackathonsAdminApi.publish(hackathonId),
                    'Published. Share the form URL and signing secret below.',
                  )
                }
              >
                Publish
              </Button>
            )}
            {status === 'published' && (
              <Button
                variant="ghost"
                loading={busy === 'unpublish'}
                disabled={!!busy}
                onClick={() =>
                  runAction(
                    'unpublish',
                    () => externalHackathonsAdminApi.update(hackathonId, { status: 'draft' }),
                    'Unpublished. The form no longer accepts submissions.',
                  )
                }
              >
                Unpublish
              </Button>
            )}
            {status === 'published' && (
              <Button
                variant="danger"
                loading={busy === 'close'}
                disabled={!!busy}
                onClick={() =>
                  runAction(
                    'close',
                    () => externalHackathonsAdminApi.close(hackathonId),
                    'Closed. The form no longer accepts submissions.',
                  )
                }
              >
                Close
              </Button>
            )}
          </>
        }
      />

      <div className="stack-md">
        {actionError && <Alert variant="danger">{actionError}</Alert>}
        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card className="min-w-0">
            <CardHeader>
              <h3>Details</h3>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
                <dt className="text-muted">Visibility</dt>
                <dd className="capitalize text-ink">{hackathon?.visibility}</dd>
                <dt className="text-muted">Deadline</dt>
                <dd className="text-ink">{formatDateTime(hackathon?.submission_deadline)}</dd>
                <dt className="text-muted">Platform URL</dt>
                <dd className="min-w-0 truncate text-ink">
                  {hackathon?.source_platform_url ? (
                    <a href={hackathon.source_platform_url} target="_blank" rel="noreferrer">
                      {hackathon.source_platform_url}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt className="text-muted">Rubric</dt>
                <dd className="text-ink">
                  {hackathon?.evaluation_requirement_name ||
                    (hackathon?.evaluation_requirement_id ? hackathon.evaluation_requirement_id : 'No rubric')}
                </dd>
                <dt className="text-muted">Themes</dt>
                <dd className="text-ink">{themes.map((theme) => theme.name).join(', ') || '—'}</dd>
              </dl>
            </CardBody>
          </Card>
          <ExternalHackathonLinkPanel hackathon={hackathon} />
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <div>
              <h3>Submissions</h3>
              <p className="text-sm text-muted">
                {submissions.length} submission{submissions.length === 1 ? '' : 's'}
                {anyRunning ? ' · refreshing while AI analysis runs' : ''}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {submissionsError ? (
              <Alert variant="danger" title="Unable to load submissions">
                {submissionsError.message}
              </Alert>
            ) : submissionsLoading && !submissionsData ? (
              <LoadingBlock label="Loading submissions…" />
            ) : !submissions.length ? (
              <EmptyState
                icon="video"
                title="No submissions yet"
                description="Submissions appear here once teams use the form."
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Theme</th>
                      <th>Status</th>
                      <th>Evaluator</th>
                      <th>AI score</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((row) => {
                      const working = rowBusy[row.id]
                      const rowError = row.evaluation?.error || row.error
                      return (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.team_name}</strong>
                            {row.external_team_id && (
                              <div className="text-[12.5px] text-muted">{row.external_team_id}</div>
                            )}
                          </td>
                          <td>{themeName(row, themes)}</td>
                          <td>
                            <StatusBadge status={row.status} />
                            {rowError && (
                              <div className="mt-1 max-w-[260px] text-[12.5px] text-missing" title={rowError}>
                                {rowError}
                              </div>
                            )}
                          </td>
                          <td>
                            <select
                              className="select"
                              aria-label={`Evaluator for ${row.team_name}`}
                              value={row.assigned_evaluator_id || ''}
                              disabled={working === 'assign'}
                              onChange={(event) => assign(row, event.target.value)}
                            >
                              <option value="">
                                {row.assigned_evaluator_name && !row.assigned_evaluator_id
                                  ? row.assigned_evaluator_name
                                  : 'Unassigned'}
                              </option>
                              {evaluators.map((evaluator) => (
                                <option key={evaluator.id} value={evaluator.id}>
                                  {evaluator.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="mono">
                            {row.evaluation?.score != null ? formatScore(row.evaluation.score) : '—'}
                          </td>
                          <td>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setViewing(row.id)}>
                                View
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                loading={working === 'evaluate'}
                                disabled={isRunning(row) || !!working}
                                onClick={() => evaluate(row)}
                                leftIcon={<Icon name="sparkles" size={15} />}
                              >
                                {isRunning(row)
                                  ? 'Analysing…'
                                  : row.status === 'completed' || row.status === 'failed'
                                    ? 'Run again'
                                    : 'Run AI analysis'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {editing && (
        <ExternalHackathonFormModal
          open
          hackathon={hackathon}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setHackathon((current) => ({ ...current, ...saved }))
            setEditing(false)
          }}
        />
      )}

      <SubmissionDetailModal row={viewingRow} themes={themes} onClose={() => setViewing(null)} />
    </div>
  )
}
