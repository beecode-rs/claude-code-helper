import { type ReactElement, useState } from 'react'

import { PlannerDial } from '#src/renderer/src/ui-component/scheduling/planner-dial'
import { type ITriggerPreset, MAX_WINDOW_TRIGGER_PRESET } from '#src/shared/trigger-model'
import {
  DEFAULT_FIRST_TRIGGER_MINUTES,
  DEFAULT_LUNCH_START_MINUTES,
  DEFAULT_WORK_DURATION_MINUTES,
  DEFAULT_WORK_START_MINUTES,
  type IPlannerWindow,
  LUNCH_DURATION_MINUTES,
  PLANNER_DAY_MINUTES,
  formatDayMinutes,
  resolveCoverageHint,
  resolvePlannerWindows,
  resolveTriggerTimes,
} from '#src/shared/trigger-planner-model'

const FIRST_TRIGGER_SLIDER_MAX_MINUTES = 1425

const FIRST_TRIGGER_SLIDER_STEP_MINUTES = 15

const TIMELINE_TICKS: { label: string; minutes: number }[] = [
  { label: '00:00', minutes: 0 },
  { label: '03:00', minutes: 180 },
  { label: '06:00', minutes: 360 },
  { label: '09:00', minutes: 540 },
  { label: '12:00', minutes: 720 },
  { label: '15:00', minutes: 900 },
  { label: '18:00', minutes: 1080 },
  { label: '21:00', minutes: 1260 },
  { label: '24:00', minutes: 1440 },
]

const formatHourDialValue = (hour: number): string => {
  return formatDayMinutes(hour * 60)
}

const formatWorkDurationDialValue = (hours: number): string => {
  return `${String(hours)}h`
}

const resolvePercent = (minutes: number): number => {
  return (minutes / PLANNER_DAY_MINUTES) * 100
}

const resolveBarLayout = (params: {
  endMinutes: number
  startMinutes: number
}): { leftPercent: number; widthPercent: number } => {
  const clippedEndMinutes = Math.min(params.endMinutes, PLANNER_DAY_MINUTES)
  const clippedStartMinutes = Math.max(params.startMinutes, 0)

  return {
    leftPercent: resolvePercent(clippedStartMinutes),
    widthPercent: resolvePercent(clippedEndMinutes - clippedStartMinutes),
  }
}

const resolveBarHourMarks = (params: {
  endMinutes: number
  startMinutes: number
}): { leftPercent: number; minutes: number }[] => {
  const clippedStartMinutes = Math.max(params.startMinutes, 0)
  const clippedEndMinutes = Math.min(params.endMinutes, PLANNER_DAY_MINUTES)
  const spanMinutes = clippedEndMinutes - clippedStartMinutes

  if (spanMinutes <= 0) {
    return []
  }

  const firstHour = Math.floor(clippedStartMinutes / 60) + 1
  const lastHour = Math.ceil(clippedEndMinutes / 60) - 1
  const hourCount = Math.max(0, lastHour - firstHour + 1)

  return Array.from({ length: hourCount }, (_, index) => {
    const hourMinutes = (firstHour + index) * 60

    return {
      leftPercent: ((hourMinutes - clippedStartMinutes) / spanMinutes) * 100,
      minutes: hourMinutes,
    }
  })
}

const resolveTickClassName = (minutes: number): string => {
  if (minutes === 0) {
    return 'window-planner-tick is-first'
  }

  if (minutes === PLANNER_DAY_MINUTES) {
    return 'window-planner-tick is-last'
  }

  return 'window-planner-tick'
}

const resolveWindowBarLabel = (window: IPlannerWindow): string => {
  if (window.endMinutes <= PLANNER_DAY_MINUTES) {
    return window.startTime
  }

  return `${window.startTime} → ${formatDayMinutes(window.endMinutes)}`
}

const renderBarHourMarks = (params: { endMinutes: number; startMinutes: number }): ReactElement[] => {
  return resolveBarHourMarks(params).map((mark) => {
    return (
      <span className="window-planner-hour-mark" key={mark.minutes} style={{ left: `${String(mark.leftPercent)}%` }} />
    )
  })
}

const resolveWindowsSentence = (windows: IPlannerWindow[]): string => {
  return windows
    .map((window) => {
      return `${window.startTime} → ${formatDayMinutes(window.endMinutes)}`
    })
    .join(', ')
}

export const TriggerPlannerDialog = (props: {
  onClose: () => void
  onCreateTrigger: (preset: ITriggerPreset) => void
}): ReactElement => {
  const [firstTriggerMinutes, setFirstTriggerMinutes] = useState(DEFAULT_FIRST_TRIGGER_MINUTES)
  const [lunchStartMinutes, setLunchStartMinutes] = useState(DEFAULT_LUNCH_START_MINUTES)
  const [workDurationMinutes, setWorkDurationMinutes] = useState(DEFAULT_WORK_DURATION_MINUTES)
  const [workStartMinutes, setWorkStartMinutes] = useState(DEFAULT_WORK_START_MINUTES)

  const lunchEndMinutes = lunchStartMinutes + LUNCH_DURATION_MINUTES
  const workEndMinutes = workStartMinutes + workDurationMinutes
  const windows = resolvePlannerWindows({ firstTriggerMinutes, workEndMinutes })
  const coverageHint = resolveCoverageHint({ windows, workEndMinutes, workStartMinutes })
  const workBarLayout = resolveBarLayout({ endMinutes: workEndMinutes, startMinutes: workStartMinutes })
  const lunchBarLayout = resolveBarLayout({ endMinutes: lunchEndMinutes, startMinutes: lunchStartMinutes })
  const lunchBarTitle = `Lunch ${formatDayMinutes(lunchStartMinutes)}–${formatDayMinutes(lunchEndMinutes)}`
  const workBarTitle = `Work ${formatDayMinutes(workStartMinutes)}–${formatDayMinutes(workEndMinutes)}`

  const handleCreateTrigger = (): void => {
    props.onCreateTrigger({
      days: [...MAX_WINDOW_TRIGGER_PRESET.days],
      times: resolveTriggerTimes(windows),
    })
  }

  const handleLunchStartHourChange = (hour: number): void => {
    setLunchStartMinutes(hour * 60)
  }

  const handleWorkDurationHoursChange = (hours: number): void => {
    setWorkDurationMinutes(hours * 60)
  }

  const handleWorkStartHourChange = (hour: number): void => {
    setWorkStartMinutes(hour * 60)
  }

  return (
    <div className="settings-overlay">
      <section className="settings-panel window-planner-panel">
        <header className="settings-panel-header">
          <h2 className="settings-panel-title">Plan 5-hour windows</h2>
          <button className="button" onClick={props.onClose} type="button">
            Close
          </button>
        </header>
        <div className="settings-panel-body">
          <p className="trigger-explainer-text">
            Pick when the first Claude prompt fires — each window lasts exactly 5 hours and the next one starts a few
            minutes after the previous expires.
          </p>
          <div className="window-planner-dials">
            <PlannerDial
              formatValue={formatHourDialValue}
              label="Work start"
              max={23}
              min={0}
              onChange={handleWorkStartHourChange}
              step={1}
              value={workStartMinutes / 60}
            />
            <PlannerDial
              formatValue={formatWorkDurationDialValue}
              label="Work hours"
              max={16}
              min={1}
              onChange={handleWorkDurationHoursChange}
              step={1}
              value={workDurationMinutes / 60}
            />
            <PlannerDial
              formatValue={formatHourDialValue}
              label="Lunch start"
              max={23}
              min={0}
              onChange={handleLunchStartHourChange}
              step={1}
              value={lunchStartMinutes / 60}
            />
          </div>
          <label className="settings-field">
            <span className="settings-field-label">First trigger — {formatDayMinutes(firstTriggerMinutes)}</span>
            <input
              className="window-planner-range"
              max={FIRST_TRIGGER_SLIDER_MAX_MINUTES}
              min={0}
              onChange={(event) => {
                setFirstTriggerMinutes(Number.parseInt(event.target.value, 10))
              }}
              step={FIRST_TRIGGER_SLIDER_STEP_MINUTES}
              type="range"
              value={firstTriggerMinutes}
            />
            <span className="settings-hint">Local time on weekdays, in 15-minute steps.</span>
          </label>
          <div className="window-planner-timeline">
            <div className="window-planner-lane">
              {windows.map((window) => {
                const layout = resolveBarLayout({ endMinutes: window.endMinutes, startMinutes: window.startMinutes })

                return (
                  <div
                    className="window-planner-bar"
                    key={window.startTime}
                    style={{
                      left: `${String(layout.leftPercent)}%`,
                      width: `${String(layout.widthPercent)}%`,
                    }}
                  >
                    {renderBarHourMarks({ endMinutes: window.endMinutes, startMinutes: window.startMinutes })}
                    {resolveWindowBarLabel(window)}
                  </div>
                )
              })}
            </div>
            <div className="window-planner-lane">
              <div
                className="window-planner-bar is-work"
                style={{
                  left: `${String(workBarLayout.leftPercent)}%`,
                  width: `${String(workBarLayout.widthPercent)}%`,
                }}
                title={workBarTitle}
              >
                {renderBarHourMarks({ endMinutes: workEndMinutes, startMinutes: workStartMinutes })}
                {workBarTitle}
              </div>
              <div
                className="window-planner-bar is-lunch"
                style={{
                  left: `${String(lunchBarLayout.leftPercent)}%`,
                  width: `${String(lunchBarLayout.widthPercent)}%`,
                }}
                title={lunchBarTitle}
              />
            </div>
            <div className="window-planner-ticks">
              {TIMELINE_TICKS.map((tick) => {
                return (
                  <span
                    className={resolveTickClassName(tick.minutes)}
                    key={tick.label}
                    style={{ left: `${String(resolvePercent(tick.minutes))}%` }}
                  >
                    {tick.label}
                  </span>
                )
              })}
            </div>
          </div>
          {windows.length > 0 && (
            <p className="trigger-explainer-text">
              Each trigger starts a 5-hour window: {resolveWindowsSentence(windows)}.
            </p>
          )}
          {coverageHint !== undefined && <p className="window-planner-hint">{coverageHint}</p>}
        </div>
        <div className="settings-dialog-actions">
          <button
            className="button button-primary"
            disabled={windows.length === 0}
            onClick={handleCreateTrigger}
            type="button"
          >
            Create trigger
          </button>
        </div>
      </section>
    </div>
  )
}
