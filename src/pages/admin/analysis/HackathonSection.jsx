import { useState } from 'react'
import Alert from '../../../components/ui/Alert'
import Badge from '../../../components/ui/Badge'
import Card, { CardBody, CardHeader } from '../../../components/ui/Card'
import { Select } from '../../../components/ui/Input'
import { MONO } from '../../../components/drop/theme'
import { GroupedBarChart } from './AnalysisCharts'
import {
  MAX_SERIES,
  formatNumber,
  formatPercent,
  formatRating,
  formatScore,
  truncateLabel,
} from './analysisFormat'

/** One headline number. */
export function Stat({ label, value, hint }) {
  return (
    <div className="rounded-drop border border-hairline bg-surface p-3.5">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className={`${MONO} mt-1 text-[22px] font-semibold text-ink`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-[12px] text-muted">{hint}</dd>}
    </div>
  )
}

export function SectionCard({ title, description, actions, children }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {description && <p className="mt-1 text-[12.5px] text-muted">{description}</p>}
        </div>
        {actions}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  )
}

const PORTAL_BARS = [
  { key: 'portal_registered_students', name: 'Registered on portal', slot: 0 },
  { key: 'participating_students', name: 'Participated', slot: 1 },
  { key: 'submission_count', name: 'Submissions', slot: 2 },
]

const ENROLMENT_BARS = [
  { key: 'enrolled_students', name: 'Enrolled', slot: 0 },
  { key: 'niat_participating', name: 'NIAT participated', slot: 1 },
  { key: 'non_niat_participating', name: 'Non NIAT participated', slot: 2 },
]

/** What the university and batch charts can plot, per hackathon. */
const CAMPUS_METRICS = [
  { key: 'participation_rate_percent', label: 'Participation rate', percent: true },
  { key: 'participating_students', label: 'Participating students' },
  { key: 'submission_count', label: 'Submissions' },
  { key: 'enrolled_students', label: 'Enrolled students' },
  { key: 'registered_students', label: 'Registered students' },
]

/**
 * One object per campus or batch, with a key per hackathon, for Recharts:
 * `{ name, size, h0: 12, h1: 4, … }`. A hackathon the row has no point for
 * stays undefined, so its bar is simply missing rather than drawn as 0.
 */
function flattenSeries(rows, nameOf, sizeOf, hackathons, metricKey) {
  return rows.map((row) => {
    const flat = { name: nameOf(row), size: sizeOf(row) }
    const byId = new Map((row.series || []).map((point) => [point.hackathon_id, point]))
    hackathons.forEach((hackathon, index) => {
      const value = byId.get(hackathon.hackathon_id)?.[metricKey]
      flat[`h${index}`] = value === null || value === undefined ? undefined : Number(value)
    })
    return flat
  })
}

/**
 * Bars per campus (or batch), one per selected hackathon, with a choice of
 * metric. Hackathons keep the colour of their place in the selection; past
 * eight the chart shows the first eight and the table below lists them all.
 */
function CampusComparison({ title, description, rows, nameOf, sizeOf, sizeLabel, hackathons }) {
  const [metricKey, setMetricKey] = useState(CAMPUS_METRICS[0].key)
  const metric = CAMPUS_METRICS.find((m) => m.key === metricKey) || CAMPUS_METRICS[0]
  const charted = hackathons.slice(0, MAX_SERIES)
  const data = flattenSeries(rows, nameOf, sizeOf, hackathons, metric.key)
  const bars = charted.map((hackathon, index) => ({ key: `h${index}`, name: hackathon.name, slot: index }))
  const format = metric.percent ? formatPercent : formatNumber

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        <div className="w-[210px] shrink-0">
          <Select
            aria-label={`${title}: metric`}
            value={metricKey}
            onChange={(event) => setMetricKey(event.target.value)}
          >
            {CAMPUS_METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {rows.length ? (
        <div className="stack-md">
          {hackathons.length > MAX_SERIES && (
            <p className="text-[12.5px] text-muted">
              The chart shows the first {MAX_SERIES} hackathons; the table lists all {hackathons.length}.
            </p>
          )}
          <GroupedBarChart
            data={data}
            xKey="name"
            bars={bars}
            height={300}
            formatValue={format}
            allowDecimals={metric.percent}
            minWidthPerGroup={Math.max(120, charted.length * 18 + 24)}
            tickFormatter={(label) => truncateLabel(label)}
            tooltipLabelFormatter={(label) => label}
            ariaLabel={`${title}, ${metric.label} by hackathon.`}
          />
          <details>
            <summary className="cursor-pointer text-[13px] text-muted">Show as a table</summary>
            <div className="table-wrap mt-3">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>{sizeLabel}</th>
                    {hackathons.map((hackathon) => (
                      <th key={hackathon.hackathon_id}>{hackathon.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr key={`${row.name}-${rowIndex}`}>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      <td>{formatNumber(row.size)}</td>
                      {hackathons.map((hackathon, index) => (
                        <td key={hackathon.hackathon_id}>{format(row[`h${index}`])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      ) : (
        <p className="py-6 text-center text-[13px] text-muted">No campuses in these hackathons.</p>
      )}
    </SectionCard>
  )
}

function CampusBlock({ title, block }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-[13.5px] font-semibold text-ink">{title}</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-muted">Campuses</dt>
        <dd className={`${MONO} text-right text-ink`}>{formatNumber(block?.campus_count)}</dd>
        <dt className="text-muted">Total students</dt>
        <dd className={`${MONO} text-right text-ink`}>{formatNumber(block?.headcount)}</dd>
        <dt className="text-muted">Registered</dt>
        <dd className={`${MONO} text-right text-ink`}>{formatNumber(block?.registered_students)}</dd>
        <dt className="text-muted">Enrolled</dt>
        <dd className={`${MONO} text-right text-ink`}>{formatNumber(block?.enrolled_students)}</dd>
        <dt className="text-muted">Participated</dt>
        <dd className={`${MONO} text-right text-ink`}>{formatNumber(block?.participating_students)}</dd>
        <dt className="text-muted">Submissions</dt>
        <dd className={`${MONO} text-right text-ink`}>{formatNumber(block?.submission_count)}</dd>
      </dl>
      {Number(block?.campuses_missing_headcount) > 0 && (
        <p className="mt-2 text-[12px] text-muted">
          {block.campuses_missing_headcount} campus
          {Number(block.campuses_missing_headcount) === 1 ? ' has' : 'es have'} no total-students
          value yet.
        </p>
      )}
    </div>
  )
}

/** Per hackathon: NIAT vs Non NIAT reach, plus review coverage. */
function CampusCard({ hackathon }) {
  const scope =
    hackathon.all_universities && hackathon.all_batches
      ? 'Open to every university and batch.'
      : 'Limited to the universities and batches in its visibility settings.'
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{hackathon.name}</h3>
          <p className="mt-1 text-[12.5px] text-muted">{scope}</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="stack-md">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CampusBlock title="NIAT" block={hackathon.niat} />
            <CampusBlock title="Non NIAT" block={hackathon.non_niat} />
          </div>
          <dl className="grid grid-cols-1 gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
            <Stat label="Assigned to an evaluator" value={formatPercent(hackathon.assignment_coverage_percent)} />
            <Stat label="Approved" value={formatPercent(hackathon.approval_rate_percent)} />
            <Stat
              label="Eligible, no campus on profile"
              value={formatNumber(hackathon.students_without_campus)}
            />
          </dl>
        </div>
      </CardBody>
    </Card>
  )
}

/** Top-N rating, winners and the score spread for one hackathon. */
function QualityCard({ hackathon, ratingMax }) {
  const quality = hackathon.project_quality || {}
  const winners = Array.isArray(quality.winners) ? quality.winners : []
  const bands = Array.isArray(quality.score_bands) ? quality.score_bands : []
  const hasWinners = Number(quality.winner_count) > 0

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{hackathon.name}</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            {quality.round_title ? `${quality.round_title} · ` : ''}Top {quality.requested_top_n}
            {quality.tie_at_cutoff ? ` (${quality.winner_count} with a tie at the cut-off)` : ''}
          </p>
        </div>
        {quality.announced_top_n ? (
          <Badge variant="success">
            Announced top {quality.announced_top_n}
            {quality.announced_count ? ` · ${quality.announced_count} people` : ''}
          </Badge>
        ) : null}
      </CardHeader>
      <CardBody>
        {!hasWinners ? (
          <p className="py-6 text-center text-[13px] text-muted">No approved scores yet</p>
        ) : (
          <div className="stack-md">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="text-[12.5px] text-muted">Project rating</div>
                <div className={`${MONO} text-[40px] font-semibold leading-none text-ink`}>
                  {formatRating(quality.average_rating_10)}
                  <span className="text-[18px] text-muted"> / {ratingMax}</span>
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  Average {formatScore(quality.average_score)} / 100 across the top{' '}
                  {quality.winner_count}
                </div>
              </div>
              <div>
                <div className="text-[12.5px] text-muted">Everyone approved</div>
                <div className={`${MONO} text-[22px] font-semibold text-ink`}>
                  {formatRating(quality.field_average_rating_10)}
                  <span className="text-[14px] text-muted"> / {ratingMax}</span>
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  {formatNumber(quality.approved_count)} approved scores
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Team</th>
                    <th>Campus</th>
                    <th>Batch</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                    <th style={{ textAlign: 'right' }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((winner) => (
                    <tr key={winner.submission_id}>
                      <td className={MONO}>{winner.rank_label || winner.rank}</td>
                      <td style={{ fontWeight: 600 }}>{winner.student_name}</td>
                      <td>{winner.team_name || '—'}</td>
                      <td>{winner.university_name || '—'}</td>
                      <td>{winner.batch_name || '—'}</td>
                      <td className={MONO} style={{ textAlign: 'right' }}>
                        {formatScore(winner.score)}
                      </td>
                      <td className={MONO} style={{ textAlign: 'right' }}>
                        {formatRating(winner.rating_10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {bands.some((band) => Number(band.count) > 0) && (
          <div className="mt-5 border-t border-hairline pt-4">
            <h4 className="mb-2 text-[13.5px] font-semibold text-ink">Approved scores by band</h4>
            <GroupedBarChart
              data={bands}
              xKey="label"
              bars={[{ key: 'count', name: 'Approved scores', slot: 0 }]}
              height={200}
              ariaLabel={`Approved scores by band: ${bands.map((b) => `${b.label} ${b.count}`).join(', ')}`}
            />
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/** Everything that comes from POST /admin/analysis/hackathons. */
export default function HackathonSection({ report, ratingMax = 10 }) {
  const comparison = Array.isArray(report.comparison) ? report.comparison : []
  const hackathons = Array.isArray(report.hackathons) ? report.hackathons : []
  const universityRows = Array.isArray(report.university_comparison) ? report.university_comparison : []
  const batchRows = Array.isArray(report.batch_comparison) ? report.batch_comparison : []

  return (
    <div className="stack-lg">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Students on the portal" value={formatNumber(report.portal_registered_students)} />
        <Stat label="Submissions" value={formatNumber(report.total_submissions)} />
        <Stat
          label="Students who submitted"
          value={formatNumber(report.unique_participating_students)}
          hint="Each student once"
        />
        <Stat
          label="Enrollments"
          value={formatNumber(report.sum_enrolled_students)}
          hint="Added across hackathons"
        />
        <Stat
          label="Average project rating"
          value={
            report.average_project_rating_10 === null || report.average_project_rating_10 === undefined
              ? '—'
              : `${formatRating(report.average_project_rating_10)} / ${ratingMax}`
          }
          hint={`Top ${report.top_n} per hackathon`}
        />
        <Stat label="Average winner score" value={formatScore(report.average_winner_score)} hint="Out of 100" />
      </dl>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Reach per hackathon"
          description="Every group shows the same portal total, so the bars stay on an honest scale."
        >
          <GroupedBarChart
            data={comparison}
            xKey="name"
            bars={PORTAL_BARS}
            minWidthPerGroup={120}
            tickFormatter={(label) => truncateLabel(label)}
            tooltipLabelFormatter={(label) => label}
            ariaLabel={`Registered, participated and submissions for ${comparison.length} hackathons.`}
          />
        </SectionCard>
        <SectionCard title="Enrolment and NIAT split" description="Enrolled students, and who took part by college type.">
          <GroupedBarChart
            data={comparison}
            xKey="name"
            bars={ENROLMENT_BARS}
            minWidthPerGroup={120}
            tickFormatter={(label) => truncateLabel(label)}
            tooltipLabelFormatter={(label) => label}
            ariaLabel={`Enrolled, NIAT and Non NIAT participation for ${comparison.length} hackathons.`}
          />
        </SectionCard>
      </div>

      <CampusComparison
        title="Universities"
        description="Per campus. Total students is the NIAT headcount, or the batch strengths added up when the campus has none."
        rows={universityRows}
        nameOf={(row) => row.university_name}
        sizeOf={(row) => row.headcount}
        sizeLabel="Total students"
        hackathons={comparison}
      />
      <CampusComparison
        title="Batches"
        description="Per batch. Participation rate is participating students divided by the batch strength."
        rows={batchRows}
        nameOf={(row) => `${row.batch_name} · ${row.university_name}`}
        sizeOf={(row) => row.strength}
        sizeLabel="Strength"
        hackathons={comparison}
      />

      <div>
        <h3 className="mb-3 text-[16px] font-semibold text-ink">Campus reach</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {hackathons.map((hackathon) => (
            <CampusCard key={hackathon.hackathon_id} hackathon={hackathon} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-[16px] font-semibold text-ink">Project quality</h3>
        <p className="mb-3 text-[12.5px] text-muted">
          From the latest round with an approved score. A tie on the last place is kept, so the top{' '}
          {report.top_n} can include more people.
        </p>
        {hackathons.length ? (
          <div className="grid grid-cols-1 gap-4">
            {hackathons.map((hackathon) => (
              <QualityCard key={hackathon.hackathon_id} hackathon={hackathon} ratingMax={ratingMax} />
            ))}
          </div>
        ) : (
          <Alert variant="info">No hackathons in this report.</Alert>
        )}
      </div>
    </div>
  )
}
