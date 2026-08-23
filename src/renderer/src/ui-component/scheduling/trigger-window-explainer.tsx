import type { ReactElement } from 'react'

import { minutesTimeUtil } from '#src/renderer/src/util/minutes-time-util'
import { MAX_WINDOW_TRIGGER_PRESET } from '#src/shared/trigger-model'
import { formatDayMinutes } from '#src/shared/trigger-planner-model'
import { FIVE_HOUR_WINDOW_MS } from '#src/shared/usage-model'

interface ITimeRange {
  endMinutes: number
  startMinutes: number
}

interface IWindowSegment extends ITimeRange {
  startTime: string
}

const DIAGRAM_DOMAIN_MINUTES: ITimeRange = { endMinutes: 23 * 60, startMinutes: 6 * 60 }

const DIAGRAM_TICKS: string[] = ['07:00', '12:00', '17:00', '22:00']

const WORK_RANGE: ITimeRange = { endMinutes: 18 * 60, startMinutes: 10 * 60 }

const WORK_RANGE_LABEL = 'Work 10:00–18:00'

const WINDOW_MINUTES = FIVE_HOUR_WINDOW_MS / 60_000

const resolvePositionPercent = (params: { minutes: number }): number => {
  const domainMinutes = DIAGRAM_DOMAIN_MINUTES.endMinutes - DIAGRAM_DOMAIN_MINUTES.startMinutes
  const offsetMinutes = params.minutes - DIAGRAM_DOMAIN_MINUTES.startMinutes

  return (offsetMinutes / domainMinutes) * 100
}

const resolveSegmentLayout = (params: { range: ITimeRange }): { leftPercent: number; widthPercent: number } => {
  const leftPercent = resolvePositionPercent({ minutes: params.range.startMinutes })
  const rightPercent = resolvePositionPercent({ minutes: params.range.endMinutes })

  return { leftPercent, widthPercent: rightPercent - leftPercent }
}

const resolveWindowSegments = (): IWindowSegment[] => {
  return MAX_WINDOW_TRIGGER_PRESET.times.map((startTime) => {
    const startMinutes = minutesTimeUtil.resolveMinutes(startTime)

    return {
      endMinutes: startMinutes + WINDOW_MINUTES,
      startMinutes,
      startTime,
    }
  })
}

const resolveWindowSentence = (): string => {
  return resolveWindowSegments()
    .map((segment) => {
      const endTime = formatDayMinutes(segment.endMinutes)

      return `${segment.startTime} → ${endTime}`
    })
    .join(', ')
}

export const TriggerWindowExplainer = (): ReactElement => {
  const windowSegments = resolveWindowSegments()
  const workLayout = resolveSegmentLayout({ range: WORK_RANGE })

  return (
    <div className="trigger-explainer">
      <button
        aria-describedby="trigger-window-explainer-tip"
        aria-label="How the max 5h windows preset works"
        className="trigger-icon-button"
        type="button"
      >
        <svg
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
          viewBox="0 0 16 16"
          width="14"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7.5v3.5" />
          <path d="M8 4.8v0.01" />
        </svg>
      </button>
      <div className="trigger-explainer-popup" id="trigger-window-explainer-tip" role="tooltip">
        <p className="trigger-explainer-title">Making the most of 5-hour windows</p>
        <p className="trigger-explainer-text">
          Plan usage is measured in 5-hour windows. The first prompt starts a window, and the quota resets when it
          expires.
        </p>
        <div className="trigger-window-diagram">
          <div className="trigger-window-diagram-lane">
            {windowSegments.map((segment) => {
              const layout = resolveSegmentLayout({ range: segment })

              return (
                <div
                  className="trigger-window-diagram-bar"
                  key={segment.startTime}
                  style={{
                    left: `${String(layout.leftPercent)}%`,
                    width: `${String(layout.widthPercent)}%`,
                  }}
                >
                  {segment.startTime}
                </div>
              )
            })}
          </div>
          <div className="trigger-window-diagram-lane">
            <div
              className="trigger-window-diagram-bar is-work"
              style={{
                left: `${String(workLayout.leftPercent)}%`,
                width: `${String(workLayout.widthPercent)}%`,
              }}
            >
              {WORK_RANGE_LABEL}
            </div>
          </div>
          <div className="trigger-window-diagram-ticks">
            {DIAGRAM_TICKS.map((tick) => {
              const leftPercent = resolvePositionPercent({ minutes: minutesTimeUtil.resolveMinutes(tick) })

              return (
                <span className="trigger-window-diagram-tick" key={tick} style={{ left: `${String(leftPercent)}%` }}>
                  {tick}
                </span>
              )
            })}
          </div>
        </div>
        <p className="trigger-explainer-text">
          Each trigger restarts the window: {resolveWindowSentence()}. The small gaps make sure the previous window has
          fully expired, so every run starts a fresh one.
        </p>
        <p className="trigger-explainer-text">
          If you work 10:00–18:00, your workday spans all three windows — fresh quota for the morning, midday and late
          afternoon — and the 17:05 window keeps covering the evening until 22:05.
        </p>
      </div>
    </div>
  )
}
