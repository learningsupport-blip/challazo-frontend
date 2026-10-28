import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Input, { Textarea } from '../ui/Input'
import Card, { CardBody, CardHeader } from '../ui/Card'

function formatScore(value) {
  if (value == null) return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return number % 1 ? number.toFixed(1) : String(number)
}

/**
 * Evaluator sidebar: preview total, optional AI override, remarks, submit.
 *
 * With `manualEvaluation` (AI failed or never ran) there is no AI score to
 * override, so the toggle goes and the AI fields are always scored here.
 */
export default function SubmitForReviewCard({
  preview,
  scorecardBase,
  readOnlyReview,
  reviewStatus,
  canEditManual,
  canSubmit,
  manualComplete,
  manualEvaluation = false,
  handAiComplete = true,
  overrideEnabled,
  onOverrideEnabledChange,
  aiOverrideByFieldKey,
  onAiOverrideChange,
  notes,
  onNotesChange,
  onSubmit,
  submitting = false,
  finalScore,
}) {
  const aiMetrics = (scorecardBase?.metrics || []).filter((metric) => metric.scoring_mode === 'ai')
  const showAiInputs = manualEvaluation || overrideEnabled

  return (
    <Card className="submit-for-review-card">
      <CardHeader>
        <h3>{readOnlyReview ? 'Review status' : 'Submit for review'}</h3>
      </CardHeader>
      <CardBody className="stack-md">
        <div className="submit-for-review-card__total">
          <span className="submit-for-review-card__total-label">Preview total</span>
          <strong>
            {formatScore(preview?.computed_total)}
            <small>/ 100</small>
          </strong>
        </div>

        {readOnlyReview ? (
          <>
            <ReviewStatusBadge status={reviewStatus} />
            {reviewStatus === 'approved' && finalScore != null ? (
              <p className="submit-for-review-card__hint">
                Approved final score: <strong>{formatScore(finalScore)}/100</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {canEditManual ? (
          <>
            <div className="submit-for-review-card__override">
              {manualEvaluation ? (
                <strong>Score AI fields by hand</strong>
              ) : (
                <label className="submit-for-review-card__override-toggle">
                  <input
                    type="checkbox"
                    checked={overrideEnabled}
                    onChange={(event) => onOverrideEnabledChange(event.target.checked)}
                  />
                  <span className="submit-for-review-card__override-track">
                    <span />
                  </span>
                  <strong>Override Scores</strong>
                </label>
              )}

              {showAiInputs ? (
                <div className="submit-for-review-card__override-fields">
                  {aiMetrics.map((metric) => (
                    <Input
                      key={metric.field_key}
                      label={
                        manualEvaluation
                          ? `${metric.field_label || metric.field_key} (0–${metric.max_score})`
                          : metric.field_label || metric.field_key
                      }
                      required={manualEvaluation && Number(metric.weight) > 0}
                      type="number"
                      min={0}
                      max={metric.max_score}
                      step={metric.max_score <= 20 ? 0.5 : 1}
                      value={aiOverrideByFieldKey[metric.field_key] ?? ''}
                      onChange={(event) =>
                        onAiOverrideChange(metric.field_key, event.target.value)
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="submit-for-review-card__summary">
              <div>
                <span>AI SCORE</span>
                <strong>{formatScore(preview?.ai_total)}</strong>
              </div>
              <div>
                <span>MANUAL SCORE</span>
                <strong>{formatScore(preview?.manual_total)}</strong>
              </div>
            </div>

            <Textarea
              label="Remarks"
              hint="Optional"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
            />

            <Button
              variant="success"
              block
              disabled={!canSubmit}
              loading={submitting}
              onClick={onSubmit}
              leftIcon={<Icon name="check" size={17} />}
            >
              {reviewStatus === 'changes_requested' ? 'Resubmit for review' : 'Submit for review'}
            </Button>

            {manualEvaluation && !handAiComplete ? (
              <p className="submit-for-review-card__hint">
                Give every AI field a score from 0 to its maximum to enable submit.
              </p>
            ) : null}
            {!manualComplete ? (
              <p className="submit-for-review-card__hint">
                Finish GitHub and MVP scoring to enable submit.
              </p>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  )
}

function ReviewStatusBadge({ status }) {
  const config =
    {
      none: { label: 'Manual Analysis Pending', variant: 'warning' },
      pending_review: { label: 'Pending admin review', variant: 'info' },
      changes_requested: { label: 'Changes requested', variant: 'danger' },
      approved: { label: 'Approved', variant: 'success' },
    }[status || 'none'] || { label: String(status).replaceAll('_', ' '), variant: 'neutral' }

  return (
    <Badge variant={config.variant} dot className="badge--review">
      {config.label}
    </Badge>
  )
}
