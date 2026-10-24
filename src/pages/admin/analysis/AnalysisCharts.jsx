import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber, useChartColors } from './analysisFormat'

/** Hover card listing every series at that category, in text ink beside a swatch. */
function ChartTooltip({ active, payload, label, formatValue = formatNumber, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[160px] rounded-drop border border-hairline bg-surface px-3 py-2 text-[12.5px] shadow-lg">
      <div className="mb-1 text-muted">{labelFormatter ? labelFormatter(label) : label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-ink">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ background: item.color }}
            />
            {item.name}
          </span>
          <span className="font-semibold text-ink">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Grouped (or single-series) bars on one y-axis.
 *
 * `bars` is `[{ key, name, slot }]`: `slot` picks the fixed categorical colour
 * so a series keeps its colour whatever else is shown. A single series draws
 * without a legend — the card title names it.
 *
 * `minWidthPerGroup` lets a long category list scroll sideways instead of
 * squeezing every label into the card. `tickFormatter` shapes the axis label;
 * the tooltip shows `tooltipLabelFormatter` (by default the same), so a
 * shortened tick can still name the category in full on hover.
 */
export function GroupedBarChart({
  data,
  xKey,
  bars,
  height = 280,
  ariaLabel,
  formatValue = formatNumber,
  tickFormatter,
  tooltipLabelFormatter = tickFormatter,
  allowDecimals = false,
  minWidthPerGroup = 0,
}) {
  const { series, chrome } = useChartColors()
  const minWidth = minWidthPerGroup ? data.length * minWidthPerGroup : 0
  const tick = { fill: chrome.muted, fontSize: 12 }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-0" style={{ height, minWidth: minWidth || undefined }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid stroke={chrome.grid} vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: chrome.grid }}
              tickFormatter={tickFormatter}
              interval={0}
              minTickGap={4}
            />
            <YAxis
              allowDecimals={allowDecimals}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value) => formatNumber(value)}
            />
            {/* Both default to sorting by name; keep the order the bars are declared in. */}
            <Tooltip
              itemSorter={(item) => bars.findIndex((bar) => bar.key === item.dataKey)}
              content={<ChartTooltip formatValue={formatValue} labelFormatter={tooltipLabelFormatter} />}
              cursor={{ fill: chrome.grid, opacity: 0.35 }}
            />
            {bars.length > 1 && (
              <Legend
                itemSorter={null}
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12.5, color: chrome.muted, paddingTop: 8 }}
              />
            )}
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.name}
                fill={series[bar.slot]}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
