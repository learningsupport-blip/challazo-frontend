import { useState } from 'react'
import { analysisApi } from '../../../api/analysis'
import { useAsync } from '../../../hooks/useAsync'
import { queryKeys } from '../../../lib/queryKeys'
import { formatDate } from '../../../utils/format'
import { WRAP_APP } from '../../../components/drop/theme'
import PageHeader from '../../../components/layout/PageHeader'
import Alert from '../../../components/ui/Alert'
import Card, { CardBody } from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import Input, { Select } from '../../../components/ui/Input'
import { LoadingBlock } from '../../../components/ui/Spinner'
import EvaluatorSection from './EvaluatorSection'
import HackathonSection from './HackathonSection'
import MultiSelect from './MultiSelect'

const DEFAULT_MAX_HACKATHONS = 12
const DEFAULT_TOP_N = 5
/** How many of the latest hackathons are picked before the admin chooses. */
const DEFAULT_PICK = 3

const list = (value) => (Array.isArray(value) ? value : [])

/** The latest few by start date, so the page shows something on first open. */
function defaultHackathonIds(hackathons) {
  return [...hackathons]
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')))
    .slice(0, DEFAULT_PICK)
    .map((h) => h.id)
}

/**
 * Admin: hackathon and evaluator analysis.
 *
 * Options load once. The hackathon report and the evaluator report are two
 * requests keyed by their own filters, so changing the top-N only reloads the
 * hackathon charts and changing evaluators or dates only reloads the
 * evaluator charts. Each keeps the last report on screen while the next one
 * loads.
 */
export default function AnalysisPage() {
  const optionsQuery = useAsync((options) => analysisApi.options(options), {
    key: queryKeys.analysisOptions,
    staleTime: 60_000,
  })
  const options = optionsQuery.data
  const hackathonOptions = list(options?.hackathons)
  const evaluatorOptions = list(options?.evaluators)
  const topChoices = list(options?.top_n_choices).length ? options.top_n_choices : [3, 5, 10]
  const maxHackathons = Number(options?.max_hackathons) || DEFAULT_MAX_HACKATHONS
  const ratingMax = Number(options?.rating_max) || 10

  // null until the admin picks: the latest few stand in, without an effect.
  const [pickedHackathons, setPickedHackathons] = useState(null)
  const [topN, setTopN] = useState(null)
  const [evaluatorIds, setEvaluatorIds] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const known = new Set(hackathonOptions.map((h) => h.id))
  const hackathonIds = (pickedHackathons ?? defaultHackathonIds(hackathonOptions)).filter((id) =>
    known.has(id),
  )
  const effectiveTopN =
    topN ?? (topChoices.includes(DEFAULT_TOP_N) ? DEFAULT_TOP_N : topChoices[0])
  const datesInvalid = Boolean(fromDate && toDate && fromDate > toDate)

  const hackathonBody = { hackathon_ids: hackathonIds, top_n: effectiveTopN }
  const hackathonKey = hackathonIds.length ? queryKeys.analysisHackathons(hackathonBody) : null
  const hackathonQuery = useAsync(
    (opts) => analysisApi.hackathons(hackathonBody, opts).then((report) => ({ key: hackathonKey, report })),
    { key: hackathonKey, enabled: Boolean(hackathonKey), staleTime: 60_000 },
  )

  const evaluatorBody = {
    hackathon_ids: hackathonIds,
    evaluator_ids: evaluatorIds,
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  }
  const evaluatorKey =
    hackathonIds.length && !datesInvalid ? queryKeys.analysisEvaluators(evaluatorBody) : null
  const evaluatorQuery = useAsync(
    (opts) => analysisApi.evaluators(evaluatorBody, opts).then((report) => ({ key: evaluatorKey, report })),
    { key: evaluatorKey, enabled: Boolean(evaluatorKey), staleTime: 60_000 },
  )

  const header = (
    <PageHeader
      eyebrow="Administration"
      title="Analysis"
      description="Compare hackathons by reach, campuses and project quality, and see how fast evaluators review."
    />
  )

  if (optionsQuery.loading && !options) {
    return (
      <div className={`${WRAP_APP} py-7 md:py-10`}>
        {header}
        <LoadingBlock label="Loading analysis…" />
      </div>
    )
  }

  if (optionsQuery.error && !options) {
    return (
      <div className={`${WRAP_APP} py-7 md:py-10`}>
        {header}
        <Alert variant="danger" title="Unable to load analysis">
          {optionsQuery.error.message}
        </Alert>
      </div>
    )
  }

  const hackathonReport = hackathonQuery.data?.report
  const hackathonStale = hackathonQuery.data?.key !== hackathonKey
  const evaluatorReport = evaluatorQuery.data?.report
  const evaluatorStale = evaluatorQuery.data?.key !== evaluatorKey

  return (
    <div className={`${WRAP_APP} py-7 md:py-10`}>
      {header}

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MultiSelect
              label="Hackathons"
              options={hackathonOptions.map((h) => ({
                value: h.id,
                label: h.name,
                hint: h.start_date ? `${formatDate(h.start_date)} – ${formatDate(h.end_date)}` : '',
              }))}
              value={hackathonIds}
              onChange={setPickedHackathons}
              max={maxHackathons}
              emptyLabel="Pick hackathons"
              placeholder="Search hackathons…"
              hint={`Up to ${maxHackathons}.`}
            />
            <Select
              label="Top scores used for the rating"
              value={String(effectiveTopN)}
              onChange={(event) => setTopN(Number(event.target.value))}
            >
              {topChoices.map((n) => (
                <option key={n} value={String(n)}>
                  Top {n}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {!hackathonIds.length ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="chart"
              title={hackathonOptions.length ? 'Pick hackathons to compare' : 'No hackathons yet'}
              description={
                hackathonOptions.length
                  ? `Choose up to ${maxHackathons} hackathons above.`
                  : 'Analysis appears once a hackathon has been created.'
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-lg">
          <section aria-labelledby="analysis-hackathons" className="stack-md">
            <h2 id="analysis-hackathons" className="text-[18px] font-semibold text-ink">
              Hackathons
            </h2>
            {hackathonQuery.error && (hackathonStale || !hackathonReport) ? (
              <Alert variant="danger" title="Unable to load the hackathon report">
                {hackathonQuery.error.message}
              </Alert>
            ) : !hackathonReport ? (
              <LoadingBlock label="Loading hackathons…" />
            ) : (
              <div
                className={hackathonStale ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}
                aria-busy={hackathonStale}
              >
                <HackathonSection report={hackathonReport} ratingMax={ratingMax} />
              </div>
            )}
          </section>

          <section aria-labelledby="analysis-evaluators" className="stack-md border-t border-hairline pt-6">
            <h2 id="analysis-evaluators" className="text-[18px] font-semibold text-ink">
              Evaluators
            </h2>
            <Card>
              <CardBody>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <MultiSelect
                    label="Evaluators"
                    options={evaluatorOptions.map((e) => ({ value: e.id, label: e.name, hint: e.email }))}
                    value={evaluatorIds}
                    onChange={setEvaluatorIds}
                    emptyLabel="Everyone"
                    placeholder="Search evaluators…"
                  />
                  <Input
                    label="From (IST)"
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                  <Input
                    label="To (IST)"
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(event) => setToDate(event.target.value)}
                    error={datesInvalid ? 'Must be on or after the From date.' : undefined}
                  />
                </div>
              </CardBody>
            </Card>

            {datesInvalid ? null : evaluatorQuery.error && (evaluatorStale || !evaluatorReport) ? (
              <Alert variant="danger" title="Unable to load the evaluator report">
                {evaluatorQuery.error.message}
              </Alert>
            ) : !evaluatorReport ? (
              <LoadingBlock label="Loading evaluators…" />
            ) : (
              <div
                className={evaluatorStale ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}
                aria-busy={evaluatorStale}
              >
                <EvaluatorSection report={evaluatorReport} />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
