import { FIVE_HOUR_WINDOW_MS } from '#src/shared/usage-model'

export const DEFAULT_FIRST_TRIGGER_MINUTES = 420

export const DEFAULT_LUNCH_START_MINUTES = 780

export const DEFAULT_WORK_DURATION_MINUTES = 480

export const DEFAULT_WORK_START_MINUTES = 600

export const LUNCH_DURATION_MINUTES = 60

export const PLANNER_DAY_MINUTES = 1440

export const WINDOW_DURATION_MINUTES = FIVE_HOUR_WINDOW_MS / 60_000

export interface IPlannerWindow {
  endMinutes: number
  startMinutes: number
  startTime: string
}

const FIRST_WINDOW_GAP_MINUTES = 302

export const formatDayMinutes = (minutes: number): string => {
  const wrappedMinutes = ((minutes % PLANNER_DAY_MINUTES) + PLANNER_DAY_MINUTES) % PLANNER_DAY_MINUTES
  const hours = Math.floor(wrappedMinutes / 60)
  const minutesPastHour = wrappedMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutesPastHour).padStart(2, '0')}`
}

export const resolvePlannerWindows = (params: {
  firstTriggerMinutes: number
  workEndMinutes: number
}): IPlannerWindow[] => {
  const startLimitMinutes = Math.min(params.workEndMinutes, PLANNER_DAY_MINUTES)

  const collectWindows = (step: {
    gapIndex: number
    startMinutes: number
    windows: IPlannerWindow[]
  }): IPlannerWindow[] => {
    if (step.startMinutes >= startLimitMinutes) {
      return step.windows
    }

    const collectedWindow: IPlannerWindow = {
      endMinutes: step.startMinutes + WINDOW_DURATION_MINUTES,
      startMinutes: step.startMinutes,
      startTime: formatDayMinutes(step.startMinutes),
    }

    return collectWindows({
      gapIndex: step.gapIndex + 1,
      startMinutes: step.startMinutes + FIRST_WINDOW_GAP_MINUTES + step.gapIndex,
      windows: [...step.windows, collectedWindow],
    })
  }

  return collectWindows({ gapIndex: 0, startMinutes: params.firstTriggerMinutes, windows: [] })
}

export const resolveTriggerTimes = (windows: IPlannerWindow[]): string[] => {
  return windows.map((window) => {
    return window.startTime
  })
}

export const resolveCoverageHint = (params: {
  windows: IPlannerWindow[]
  workEndMinutes: number
  workStartMinutes: number
}): string | undefined => {
  const firstWindow = params.windows.at(0)
  const lastWindow = params.windows.at(-1)

  if (firstWindow === undefined || lastWindow === undefined) {
    return 'No window fits before work ends — slide the first trigger earlier.'
  }

  const isFirstTooLate = firstWindow.startMinutes >= params.workStartMinutes
  const isLastTooEarly = lastWindow.endMinutes <= params.workEndMinutes

  if (isFirstTooLate && isLastTooEarly) {
    return 'The windows miss the edges of your workday — slide the first trigger so the first window starts before work and the last one ends after it.'
  }

  if (isFirstTooLate) {
    return 'The first window starts at or after work start — slide the first trigger a bit earlier.'
  }

  if (isLastTooEarly) {
    return 'The last window ends at or before work end — slide the first trigger a bit later.'
  }

  return undefined
}
