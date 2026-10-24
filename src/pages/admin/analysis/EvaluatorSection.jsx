import { useState } from 'react'
import Button from '../../../components/ui/Button'
import { MONO } from '../../../components/drop/theme'
import { GroupedBarChart } from './AnalysisCharts'
import { SectionCard, Stat } from './HackathonSection'
import {
  formatDay,
  formatHours,
  formatNumber,
  formatPercent,
  formatRating,
} from './analysisFormat'

const DAY_BARS = [
  { key: 'assigned', name: 'Assigned', slot: 0 },
  { key: 'completed', name: 'Completed', slot: 1 },
]

const finite = (values) =>
  values.filter((value) => value !== null && value !== undefined).map(Number).filter(Number.isFinite)

/**
 * Fastest and slowest across everyone shown. The overall response does not
 * carry them, but they are exact from each person's own fastest and slowest.
 */
function extremes(evaluators) {
  const fastest = finite(evaluators.map((e) => e.fastest_hours))
  const slowest = finite(evaluators.map((e) => e.slowest_hours))
  return {
    fastest: fastest.length ? Math.min(...fastest) : null,
    slowest: slowest.length ? Math.max(...slowest) : null,
  }
}

function SpeedStats({ source, fastest, slowest }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Average time to review" value={formatHours(source.average_hours)} />
      <Stat label="Median" value={formatHours(source.median_hours)} />
      <Stat label="Fastest" value={formatHours(fastest)} />
      <Stat label="Slowest" value={formatHours(slowest)} />
    </dl>
  )
}

/** One person's split across the selected hackathons. */
function ByHackathon({ rows }) {
  if (!rows?.length) return null
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Hackathon</th>
            <th style={{ textAlign: 'right' }}>Assigned</th>
            <th style={{ textAlign: 'right' }}>Completed</th>
            <th style={{ textAlign: 'right' }}>Pending</th>
            <th style={{ textAlign: 'right' }}>Average time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hackathon_id}>
              <td style={{ fontWeight: 600 }}>{row.hackathon_name}</td>
              <td className={MONO} style={{ textAlign: 'right' }}>{formatNumber(row.assigned)}</td>
              <td className={MONO} style={{ textAlign: 'right' }}>{formatNumber(row.completed)}</td>
              <td className={MONO} style={{ textAlign: 'right' }}>{formatNumber(row.pending)}</td>
              <td className={MONO} style={{ textAlign: 'right' }}>{formatHours(row.average_hours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Everything that comes from POST /admin/analysis/evaluators.
 *
 * Clicking a person swaps the day chart and the speed numbers to theirs;
 * "Everyone" goes back. People stay in API order (most assigned first).
 */
export default function EvaluatorSection({ report }) {
  const evaluators = Array.isArray(report.evaluators) ? report.evaluators : []
  const [selectedId, setSelectedId] = useState(null)
  // A person who drops out of the report (filter change) falls back to everyone.
  const person = evaluators.find((e) => e.evaluator_id === selectedId) || null

  const source = person || report
  const daily = Array.isArray(source.daily) ? source.daily : []
  const { fastest, slowest } = person
    ? { fastest: person.fastest_hours, slowest: person.slowest_hours }
    : extremes(evaluators)

  return (
    <div className="stack-lg">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Assigned" value={formatNumber(report.assigned)} />
        <Stat label="Completed" value={formatNumber(report.completed)} />
        <Stat label="Pending" value={formatNumber(report.pending)} />
        <Stat label="Completion rate" value={formatPercent(report.completion_rate_percent)} />
        <Stat
          label="Completed the same day"
          value={formatPercent(report.same_day_completion_rate_percent)}
        />
        <Stat
          label="Average rating given"
          value={formatRating(report.average_rating_10)}
          hint="On reviews later approved"
        />
      </dl>

      <SectionCard
        title={person ? `Daily work — ${person.name}` : 'Daily work — everyone'}
        description="Assigned counts each submission on the day of its latest assignment; completed on the day the review was submitted (IST). A day can have completions without assignments when the work was assigned earlier."
        actions={
          person ? (
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              Everyone
            </Button>
          ) : null
        }
      >
        <div className="stack-md">
          <SpeedStats source={source} fastest={fastest} slowest={slowest} />
          <p className="text-[12.5px] text-muted">
            Time to review runs from the latest assignment to the moment the review was submitted.
          </p>
          {daily.length ? (
            <GroupedBarChart
              data={daily}
              xKey="date"
              bars={DAY_BARS}
              tickFormatter={formatDay}
              minWidthPerGroup={44}
              ariaLabel={`Assigned and completed per day${person ? ` for ${person.name}` : ''}, ${daily.length} days.`}
            />
          ) : (
            <p className="py-6 text-center text-[13px] text-muted">No assignments or completions in this range.</p>
          )}
          {Number(report.undated_assigned) > 0 && !person && (
            <p className="text-[12px] text-muted">
              {formatNumber(report.undated_assigned)} assignment
              {Number(report.undated_assigned) === 1 ? ' has' : 's have'} no assigned date and
              {Number(report.undated_assigned) === 1 ? ' is' : ' are'} not on the chart.
            </p>
          )}
          {person && <ByHackathon rows={person.by_hackathon} />}
        </div>
      </SectionCard>

      <SectionCard title="Evaluators" description="Most assigned first. Choose a name to see their days above.">
        {evaluators.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Evaluator</th>
                  <th style={{ textAlign: 'right' }}>Assigned</th>
                  <th style={{ textAlign: 'right' }}>Completed</th>
                  <th style={{ textAlign: 'right' }}>Pending</th>
                  <th style={{ textAlign: 'right' }}>Completion</th>
                  <th style={{ textAlign: 'right' }}>Same day</th>
                  <th style={{ textAlign: 'right' }}>Average</th>
                  <th style={{ textAlign: 'right' }}>Median</th>
                  <th style={{ textAlign: 'right' }}>Fastest</th>
                  <th style={{ textAlign: 'right' }}>Slowest</th>
                  <th style={{ textAlign: 'right' }}>Rework</th>
                  <th style={{ textAlign: 'right' }}>Approved</th>
                  <th style={{ textAlign: 'right' }}>Awaiting review</th>
                  <th style={{ textAlign: 'right' }}>Changes requested</th>
                  <th style={{ textAlign: 'right' }}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {evaluators.map((e) => {
                  const selected = e.evaluator_id === selectedId
                  const cell = { textAlign: 'right' }
                  return (
                    <tr
                      key={e.evaluator_id}
                      className={`cursor-pointer transition-colors hover:bg-raised ${selected ? 'bg-raised' : ''}`}
                      onClick={() => setSelectedId(selected ? null : e.evaluator_id)}
                    >
                      <td>
                        <button
                          type="button"
                          className="link-btn text-left"
                          aria-pressed={selected}
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedId(selected ? null : e.evaluator_id)
                          }}
                        >
                          <span className="block font-semibold text-ink">{e.name}</span>
                        </button>
                        {e.email && <span className="block text-xs text-muted">{e.email}</span>}
                      </td>
                      <td className={MONO} style={cell}>{formatNumber(e.assigned)}</td>
                      <td className={MONO} style={cell}>{formatNumber(e.completed)}</td>
                      <td className={MONO} style={cell}>{formatNumber(e.pending)}</td>
                      <td className={MONO} style={cell}>{formatPercent(e.completion_rate_percent)}</td>
                      <td className={MONO} style={cell}>{formatPercent(e.same_day_completion_rate_percent)}</td>
                      <td className={MONO} style={cell}>{formatHours(e.average_hours)}</td>
                      <td className={MONO} style={cell}>{formatHours(e.median_hours)}</td>
                      <td className={MONO} style={cell}>{formatHours(e.fastest_hours)}</td>
                      <td className={MONO} style={cell}>{formatHours(e.slowest_hours)}</td>
                      <td className={MONO} style={cell}>{formatPercent(e.rework_rate_percent)}</td>
                      <td className={MONO} style={cell}>{formatNumber(e.approved)}</td>
                      <td className={MONO} style={cell}>{formatNumber(e.pending_review)}</td>
                      <td className={MONO} style={cell}>{formatNumber(e.changes_requested)}</td>
                      <td className={MONO} style={cell}>{formatRating(e.average_rating_10)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">No evaluator work in this selection.</p>
        )}
      </SectionCard>
    </div>
  )
}
