import { useState } from 'react'
import { isEvaluatorSubmitted } from '../../api/evaluation'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import { Textarea } from '../ui/Input'
import Modal from '../ui/Modal'

const REASON_MAX = 500
const REASON_REQUIRED_MESSAGE = 'Give a reason for changing the evaluator.'

/**
 * Asks for a remark before one evaluator is replaced by another. Unassigning
 * and a first assignment never come here — they save straight away. The
 * remark is sent with the assignment and kept in the submission's assignment
 * history. Allowed even after the evaluator has submitted — the dialog says so
 * plainly.
 *
 * `change` is `{ submission, toId, toName }`. Cancel, the backdrop and Escape
 * all call `onCancel`; nothing is saved until Save.
 */
export default function ReassignEvaluatorDialog({ change, saving = false, error = '', onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const [blankError, setBlankError] = useState('')
  const submission = change?.submission
  const fromName = submission?.assigned_evaluator_name || 'the current evaluator'
  const toName = change?.toName || 'the selected evaluator'
  const evaluated = isEvaluatorSubmitted(submission)
  const trimmed = reason.trim()

  const save = () => {
    if (!trimmed) {
      setBlankError(REASON_REQUIRED_MESSAGE)
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Modal
      open={Boolean(change)}
      onClose={() => !saving && onCancel()}
      title="Change evaluator"
      footer={
        <>
          <Button variant="ghost" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={evaluated ? 'danger' : 'accent'} loading={saving} disabled={saving} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="stack-md">
        {error && <Alert variant="danger">{error}</Alert>}

        <p className="text-[14px] text-ink">
          Change evaluator from <strong>{fromName}</strong> to <strong>{toName}</strong>?
          {submission?.team_name && <span className="text-muted"> · {submission.team_name}</span>}
        </p>

        {evaluated ? (
          <Alert variant="warning" title="Already evaluated">
            {fromName} has already submitted an evaluation for this submission. The change and your
            remark are recorded in its assignment history.
          </Alert>
        ) : (
          <p className="text-[13px] text-muted">
            The change and your remark are recorded in this submission&rsquo;s assignment history.
            The review status goes back to not started. AI analysis that has already run is not
            repeated.
          </p>
        )}

        <Textarea
          label="Remark"
          required
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            if (blankError) setBlankError('')
          }}
          placeholder="e.g. Conflict of interest, evaluator unavailable, workload balancing…"
          error={blankError || undefined}
          hint={`${trimmed.length}/${REASON_MAX}`}
          autoFocus
        />
      </div>
    </Modal>
  )
}
