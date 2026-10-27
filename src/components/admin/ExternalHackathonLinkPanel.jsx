import { useEffect, useState } from 'react'
import { MONO } from '../drop/theme'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card, { CardBody, CardHeader } from '../ui/Card'
import Icon from '../ui/Icon'

const STATUS_VARIANT = { draft: 'neutral', published: 'success', closed: 'warning' }

export function ExternalStatusBadge({ status }) {
  if (!status) return null
  return (
    <Badge variant={STATUS_VARIANT[status] || 'neutral'} dot>
      {status}
    </Badge>
  )
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = () =>
    navigator.clipboard
      .writeText(value)
      .then(() => setCopied(true))
      .catch(() => {})

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={copy}
      disabled={!value}
      leftIcon={<Icon name={copied ? 'check' : 'clipboard'} size={15} />}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}

/**
 * The two things the Launchpad team needs once the form is published: the
 * form URL and the signing secret. The secret is never part of the form page.
 */
export default function ExternalHackathonLinkPanel({ hackathon }) {
  const [revealed, setRevealed] = useState(false)
  const published = hackathon?.status && hackathon.status !== 'draft'
  const secret = hackathon?.signing_secret || ''

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div>
          <h3>Form link for {hackathon?.source_platform || 'the platform'}</h3>
          <p className="text-sm text-muted">Give the form URL and the signing secret to their team.</p>
        </div>
        <Icon name="upload" size={20} className="text-muted" />
      </CardHeader>
      <CardBody>
        {!published ? (
          <p className="text-[13.5px] text-muted">Publish the hackathon to share its form link.</p>
        ) : (
          <div className="stack-md">
            <div>
              <p className="label">Form URL</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className={`${MONO} min-w-0 grow truncate text-[13px] text-ink`} title={hackathon.form_url}>
                  {hackathon.form_url}
                </code>
                <CopyButton value={hackathon.form_url} label="Copy URL" />
              </div>
            </div>
            {hackathon.visibility !== 'public' && (
              <div>
                <p className="label">Signing secret</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className={`${MONO} min-w-0 grow truncate text-[13px] text-ink`}>
                    {secret ? (revealed ? secret : '•'.repeat(24)) : 'Not available'}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => setRevealed((v) => !v)} disabled={!secret}>
                    {revealed ? 'Hide' : 'Show'}
                  </Button>
                  <CopyButton value={secret} label="Copy secret" />
                </div>
                <p className="field__hint mt-2">
                  Their server signs <span className={MONO}>external_team_id</span>,{' '}
                  <span className={MONO}>team_name</span>, <span className={MONO}>leader_name</span> (empty line
                  if none) and <span className={MONO}>exp</span>, one per line, with HMAC-SHA256 and this
                  secret, and adds the hex digest as <span className={MONO}>sig</span>.
                </p>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
