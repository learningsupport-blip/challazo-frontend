import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { externalHackathonsPublicApi } from '../../api/externalHackathons'
import { BrandLockup } from '../../components/brand/BrandMark'
import { DesktopRequiredNotice } from '../../components/layout/DesktopOnly'
import { WRAP_NARROW } from '../../components/drop/theme'
import { useDropSurface } from '../../components/drop/useDropSurface'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card, { CardBody, CardHeader } from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Input, { Select, Textarea } from '../../components/ui/Input'
import { LoadingBlock } from '../../components/ui/Spinner'
import { useAsync } from '../../hooks/useAsync'
import { isHandheldDevice } from '../../utils/device'
import { formatDateTime, formatFileSize } from '../../utils/format'
import { uploadVideoToStorage } from '../../utils/videoUpload'

const MAX_VIDEO_BYTES = 500 * 1024 * 1024

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/mpeg',
  'video/ogg',
  'video/x-msvideo',
]

/** Some browsers report no type for .mkv / .avi; fall back to the extension. */
const TYPE_BY_EXTENSION = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  avi: 'video/x-msvideo',
}

function videoTypeOf(file) {
  if (ACCEPTED_TYPES.includes(file?.type)) return file.type
  const extension = String(file?.name || '').split('.').pop().toLowerCase()
  return TYPE_BY_EXTENSION[extension] || ''
}

/** The API refuses team ids with a slash, a backslash or `..`. */
function teamIdProblem(value) {
  if (!value) return 'Team ID is required.'
  if (/[/\\]/.test(value) || value.includes('..')) return 'Team ID cannot contain /, \\ or ..'
  return ''
}

function Shell({ children }) {
  return (
    <div className="drop min-h-screen bg-canvas">
      <header className={`${WRAP_NARROW} flex items-center py-6`}>
        <BrandLockup />
      </header>
      <main className={`${WRAP_NARROW} pb-16`}>{children}</main>
    </div>
  )
}

/**
 * Public submission form for an external hackathon, opened from Launchpad.
 *
 * Restricted hackathons arrive on a signed link: team id, team name, leader,
 * `exp` and `sig` come from the query string, are shown read-only, and are
 * passed back unchanged on both calls. Public hackathons let the person type
 * the team name and id, and never send `exp` or `sig`.
 */
export default function ExternalSubmitPage() {
  useDropSurface()
  const { hackathonId } = useParams()
  const [params] = useSearchParams()
  const { data: hackathon, loading, error } = useAsync((options) =>
    externalHackathonsPublicApi.get(hackathonId, options),
  )

  const [teamName, setTeamName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [themeId, setThemeId] = useState('')
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [submitted, setSubmitted] = useState(null)
  // A finished upload for the chosen file, so a failed submit can retry without re-uploading.
  const uploadRef = useRef(null)
  // Re-checked every half minute so the deadline and link expiry close the form on time.
  const [now, setNow] = useState(() => Date.now())
  const [handheld] = useState(isHandheldDevice)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const restricted = hackathon?.visibility !== 'public'
  const link = {
    external_team_id: params.get('external_team_id') || '',
    team_name: params.get('team_name') || '',
    leader_name: params.get('leader_name') || '',
    exp: params.get('exp') || '',
    sig: params.get('sig') || '',
  }
  const linkComplete = Boolean(link.external_team_id && link.team_name && link.exp && link.sig)
  const linkExpired = Boolean(link.exp) && Number(link.exp) * 1000 < now

  const deadline = hackathon?.submission_deadline ? new Date(hackathon.submission_deadline) : null
  const deadlinePassed = Boolean(deadline) && deadline.getTime() < now
  const open = hackathon?.status === 'published' && !deadlinePassed
  const themes = Array.isArray(hackathon?.themes) ? hackathon.themes : []

  /** Team fields sent on both calls. */
  const teamPayload = () =>
    restricted
      ? {
          external_team_id: link.external_team_id,
          team_name: link.team_name,
          ...(link.leader_name ? { leader_name: link.leader_name } : {}),
          exp: Number(link.exp),
          sig: link.sig,
        }
      : {
          external_team_id: teamId.trim(),
          team_name: teamName.trim(),
          ...(link.leader_name ? { leader_name: link.leader_name } : {}),
        }

  const chooseFile = (event) => {
    const next = event.target.files?.[0] || null
    setFormError('')
    uploadRef.current = null
    if (!next) {
      setFile(null)
      setFileError('')
      return
    }
    if (!videoTypeOf(next)) {
      setFile(null)
      setFileError('Choose an MP4, WebM, MOV, MKV, MPEG, OGG or AVI video.')
      return
    }
    if (next.size > MAX_VIDEO_BYTES) {
      setFile(null)
      setFileError(`The video is ${formatFileSize(next.size)}. The limit is 500 MiB.`)
      return
    }
    setFile(next)
    setFileError('')
  }

  const validate = () => {
    if (!restricted) {
      if (!teamName.trim()) return 'Team name is required.'
      const problemWithId = teamIdProblem(teamId.trim())
      if (problemWithId) return problemWithId
    }
    if (!themeId) return 'Choose a theme.'
    if (!problem.trim()) return 'Problem statement is required.'
    if (!solution.trim()) return 'Solution description is required.'
    if (!file) return 'Add a demo video.'
    return ''
  }

  const submit = async (event) => {
    event.preventDefault()
    const problemText = validate()
    if (problemText) {
      setFormError(problemText)
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const team = teamPayload()
      const contentType = videoTypeOf(file)
      let upload = uploadRef.current
      if (!upload) {
        setProgress(0)
        const plan = await externalHackathonsPublicApi.uploadUrl(hackathonId, {
          ...team,
          filename: file.name,
          content_type: contentType,
          content_length: file.size,
        })
        await uploadVideoToStorage(file, plan, { onProgress: setProgress })
        upload = {
          submission_id: plan.submission_id,
          video_path: plan.video_path,
          content_type: plan.content_type || contentType,
        }
        uploadRef.current = upload
      }
      const saved = await externalHackathonsPublicApi.submit(hackathonId, {
        ...team,
        ...upload,
        source_filename: file.name,
        theme_id: themeId,
        problem_statement: problem.trim(),
        solution_description: solution.trim(),
      })
      setSubmitted(saved || {})
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to submit. Please try again.')
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  // No submissions from a phone or tablet; the signed link still works on a laptop until it expires.
  if (handheld) {
    return (
      <Shell>
        <DesktopRequiredNotice
          steps={[
            'Copy the link below and open it on your laptop or desktop (latest Chrome or Edge works best).',
            'Or open the submission form again from your team page on a laptop.',
            'Complete and submit your project there.',
          ]}
        />
      </Shell>
    )
  }

  if (loading && !hackathon) {
    return (
      <Shell>
        <LoadingBlock label="Loading the submission form…" />
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell>
        <Alert variant="danger" title="This form could not be loaded">
          {error.status === 404 ? 'This submission form does not exist.' : error.message}
        </Alert>
      </Shell>
    )
  }

  if (submitted) {
    return (
      <Shell>
        <Card>
          <CardBody>
            <div className="stack-md items-start">
              <Icon name="checkCircle" size={32} className="text-passed" />
              <h1 className="text-2xl font-semibold text-ink">Submission received</h1>
              <p className="text-muted">
                {submitted.team_name || teamPayload().team_name}, your project for {hackathon?.name} has
                been submitted. You can close this tab.
              </p>
            </div>
          </CardBody>
        </Card>
      </Shell>
    )
  }

  const blocked = !open || (restricted && (!linkComplete || linkExpired))

  return (
    <Shell>
      <div className="stack-md">
        <div>
          <p className="eyebrow">Project submission</p>
          <h1 className="text-3xl font-semibold text-ink">{hackathon?.name}</h1>
          {hackathon?.description && <p className="mt-2 text-muted">{hackathon.description}</p>}
          {deadline && (
            <p className="mt-2 text-[13.5px] text-muted">
              Deadline: {formatDateTime(hackathon.submission_deadline)}
            </p>
          )}
        </div>

        {hackathon?.status !== 'published' ? (
          <Alert variant="warning" title="This form is not open">
            Submissions are not being accepted right now.
          </Alert>
        ) : deadlinePassed ? (
          <Alert variant="warning" title="The deadline has passed">
            Submissions closed on {formatDateTime(hackathon.submission_deadline)}.
          </Alert>
        ) : restricted && !linkComplete ? (
          <Alert variant="danger" title="This link is incomplete">
            Open the submission form again from {hackathon?.source_platform || 'your team page'}.
          </Alert>
        ) : restricted && linkExpired ? (
          <Alert variant="danger" title="This link has expired">
            Open the submission form again from {hackathon?.source_platform || 'your team page'} to get a
            fresh link.
          </Alert>
        ) : null}

        {!blocked && (
          <Card>
            <CardHeader>
              <h3>Your project</h3>
            </CardHeader>
            <CardBody>
              <form className="stack-md" onSubmit={submit} noValidate>
                {formError && <Alert variant="danger">{formError}</Alert>}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Team name"
                    required
                    value={restricted ? link.team_name : teamName}
                    readOnly={restricted}
                    disabled={submitting}
                    maxLength={200}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                  <Input
                    label="Team ID"
                    required
                    value={restricted ? link.external_team_id : teamId}
                    readOnly={restricted}
                    disabled={submitting}
                    maxLength={200}
                    onChange={(e) => setTeamId(e.target.value)}
                  />
                </div>
                {restricted && link.leader_name && (
                  <Input label="Team leader" value={link.leader_name} readOnly />
                )}

                <Select
                  label="Theme"
                  required
                  value={themeId}
                  disabled={submitting}
                  onChange={(e) => setThemeId(e.target.value)}
                >
                  <option value="">Choose a theme</option>
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </Select>
                {themes.find((theme) => theme.id === themeId)?.description && (
                  <p className="-mt-2 text-[13px] text-muted">
                    {themes.find((theme) => theme.id === themeId).description}
                  </p>
                )}

                <Textarea
                  label="Problem statement"
                  required
                  rows={4}
                  maxLength={5000}
                  value={problem}
                  disabled={submitting}
                  onChange={(e) => setProblem(e.target.value)}
                />
                <Textarea
                  label="Solution description"
                  required
                  rows={5}
                  maxLength={10000}
                  value={solution}
                  disabled={submitting}
                  onChange={(e) => setSolution(e.target.value)}
                />

                <Input
                  label="Demo video"
                  required
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  disabled={submitting}
                  onChange={chooseFile}
                  error={fileError || undefined}
                  hint={
                    file
                      ? `${file.name} · ${formatFileSize(file.size)}`
                      : 'MP4, WebM, MOV, MKV, MPEG, OGG or AVI, up to 500 MiB.'
                  }
                />

                {progress !== null && (
                  <div aria-live="polite">
                    <div className="mb-1 flex justify-between text-[12.5px] text-muted">
                      <span>Uploading video…</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-raised">
                      <div className="h-full bg-volt transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" variant="accent" loading={submitting}>
                    Submit project
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </Shell>
  )
}
