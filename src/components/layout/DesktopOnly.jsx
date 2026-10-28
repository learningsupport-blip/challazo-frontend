import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isHandheldDevice } from '../../utils/device'
import { WRAP_NARROW } from '../drop/theme'
import Button from '../ui/Button'
import Card, { CardBody } from '../ui/Card'
import Icon from '../ui/Icon'

const BANNER_DISMISSED_KEY = 'challazo:mobile-notice-dismissed'

function readDismissed() {
  try {
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Slim notice at the top of the app on a phone or tablet. Browsing is fine;
 * submitting is not, so it says so up front. Dismissible for this tab only.
 */
export function MobileNoticeBanner() {
  const [visible, setVisible] = useState(() => isHandheldDevice() && !readDismissed())
  if (!visible) return null

  const dismiss = () => {
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1')
    } catch {
      // Blocked storage: it just shows again on the next page load.
    }
    setVisible(false)
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-volt-edge bg-volt-tint px-4 py-3 text-[13.5px] text-ink"
    >
      <Icon name="monitor" size={18} className="mt-0.5 shrink-0" />
      <p className="grow">
        <strong>Challazo works best on a laptop.</strong> You can look around on your phone, but submissions
        can only be made from a laptop or desktop computer.
      </p>
      <button type="button" className="icon-btn shrink-0" onClick={dismiss} aria-label="Dismiss notice">
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = () =>
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => setCopied(true))
      .catch(() => {})

  return (
    <Button
      variant="accent"
      block
      onClick={copy}
      leftIcon={<Icon name={copied ? 'check' : 'clipboard'} size={17} />}
    >
      {copied ? 'Link copied' : 'Copy link to this page'}
    </Button>
  )
}

const SIGNED_IN_STEPS = [
  'Open this page on your laptop or desktop (latest Chrome or Edge works best).',
  'Sign in with the same account, if asked.',
  'Complete and submit your project there.',
]

/**
 * Full stop for a submission screen on a phone or tablet. Shown in place of
 * the form, so nothing can be recorded, uploaded or submitted from here.
 * No page wrapper of its own, so pages with their own shell can place it.
 */
export function DesktopRequiredNotice({ backTo, backLabel = 'Back to dashboard', steps = SIGNED_IN_STEPS }) {
  return (
    <Card>
      <CardBody>
        <div className="stack-md">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-volt-tint text-ink">
            <Icon name="monitor" size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Please switch to a laptop to submit</h1>
            <p className="mt-2 text-muted">
              Submissions can only be made from a laptop or desktop computer. Recording your demo, uploading
              the video and checking your entry need a larger screen and a steady connection, so phones and
              tablets are not supported for this step.
            </p>
          </div>
          <div className="rounded-drop border border-hairline p-4">
            <p className="label">What to do next</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] text-ink">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <p className="text-[13px] text-muted">
            Nothing has been submitted from this device. Copy the link below and send it to yourself to open
            it on your laptop.
          </p>
          <div className="stack-sm">
            <CopyLinkButton />
            {backTo && (
              <Button as={Link} to={backTo} variant="ghost" block>
                {backLabel}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Wrap a submission route: on a phone or tablet it renders the notice instead,
 * so the page and its upload code never mount.
 */
export default function DesktopOnly({ children, backTo, backLabel }) {
  const [handheld] = useState(isHandheldDevice)
  if (handheld) {
    return (
      <div className={`${WRAP_NARROW} py-10`}>
        <DesktopRequiredNotice backTo={backTo} backLabel={backLabel} />
      </div>
    )
  }
  return children
}
