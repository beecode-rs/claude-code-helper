import { type ReactElement, useState } from 'react'

import '#src/renderer/src/ui-component/development/development-page.css'
import { SliderField } from '#src/renderer/src/ui-component/development/slider-field'
import { UsageWindowBox } from '#src/renderer/src/ui-component/usage-dashboard/usage-window-box'
import { dateUtil } from '#src/renderer/src/util/date-util'
import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'
import { usageSeverityUtil } from '#src/renderer/src/util/usage-severity-util'

const DEFAULT_ELAPSED_MINUTES = 60
const DEFAULT_USED_PERCENT = 45
const MAX_ELAPSED_MINUTES = 300
const MAX_USED_PERCENT = 100
const MONTH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

const SEVERITY_BANDS = [
  { colorVar: 'var(--meter-accent)', label: 'Normal', range: '0–69%' },
  { colorVar: 'var(--meter-warning)', label: 'Filling up', range: '70–84%' },
  { colorVar: 'var(--meter-serious)', label: 'High usage', range: '85–94%' },
  { colorVar: 'var(--meter-critical)', label: 'Limit reached', range: '95–100%' },
]

export const DevelopmentPage = (): ReactElement => {
  const [usedPercent, setUsedPercent] = useState(DEFAULT_USED_PERCENT)
  const [elapsedMinutes, setElapsedMinutes] = useState(DEFAULT_ELAPSED_MINUTES)

  const resolveResetAt = (): number => {
    const elapsedMs = elapsedMinutes * 60_000

    return Date.now() + usageResetUtil.fiveHourWindowMs - elapsedMs
  }

  const resolveMonthlyResetAt = (): number => {
    const elapsedFraction = elapsedMinutes / MAX_ELAPSED_MINUTES
    const elapsedMs = elapsedFraction * MONTH_WINDOW_MS

    return Date.now() + MONTH_WINDOW_MS - elapsedMs
  }

  const resolveUsageValueText = (): string => {
    const severityLabel = usageSeverityUtil.resolveSeverityLabel(usedPercent)
    const percentText = `${String(usedPercent)}%`

    if (severityLabel === '') {
      return percentText
    }

    return `${percentText} · ${severityLabel}`
  }

  const resolveElapsedValueText = (): string => {
    const elapsedText = dateUtil.formatDuration(elapsedMinutes * 60_000)

    return `${elapsedText} elapsed`
  }

  return (
    <div className="development-page">
      <header>
        <h1 className="development-page-title">Development</h1>
        <p className="development-page-subtitle">
          Drag the sliders to preview the five hour window and monthly boxes at any usage level and point in the window.
        </p>
      </header>
      <section className="development-page-panel">
        <UsageWindowBox
          resetAt={resolveResetAt()}
          title="5-hour window"
          usedPercent={usedPercent}
          windowMs={usageResetUtil.fiveHourWindowMs}
        />
        <UsageWindowBox
          resetAt={resolveMonthlyResetAt()}
          title="Monthly"
          usedPercent={usedPercent}
          windowMs={MONTH_WINDOW_MS}
        />
      </section>
      <section className="development-page-panel">
        <SliderField
          label="Usage"
          max={MAX_USED_PERCENT}
          onChange={setUsedPercent}
          value={usedPercent}
          valueText={resolveUsageValueText()}
        />
        <SliderField
          label="Reset"
          max={MAX_ELAPSED_MINUTES}
          onChange={setElapsedMinutes}
          value={elapsedMinutes}
          valueText={resolveElapsedValueText()}
        />
      </section>
      <section className="development-page-panel">
        <h2 className="development-page-section-title">Color bands</h2>
        <ul className="development-page-bands">
          {SEVERITY_BANDS.map((band) => {
            return (
              <li className="development-page-band" key={band.label}>
                <span className="development-page-band-swatch" style={{ backgroundColor: band.colorVar }} />
                <span className="development-page-band-label">{band.label}</span>
                <span className="development-page-band-range">{band.range}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
