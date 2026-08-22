import { dateUtil } from '#src/renderer/src/util/date-util'
import type { ProviderId } from '#src/shared/usage-model'

const PEAK_END_MINUTE_OF_DAY = 18 * 60
const PEAK_START_MINUTE_OF_DAY = 14 * 60
const WEEKDAY_FIRST = 1
const WEEKDAY_LAST = 5
const ZAI_UTC_OFFSET_MINUTES = 8 * 60

interface IZaiPeakInfo {
  isPeakHour: boolean
  peakEndsAtText: string
  peakWindowText: string
}

export const zaiPeakUtil = {
  _resolveUtc8WallClock: (params: { nowMs: number }): { dayStartMs: number; minuteOfDay: number; weekday: number } => {
    const shiftedDate = new Date(params.nowMs + ZAI_UTC_OFFSET_MINUTES * 60_000)
    const utc8DayStartMs = Date.UTC(shiftedDate.getUTCFullYear(), shiftedDate.getUTCMonth(), shiftedDate.getUTCDate())

    return {
      dayStartMs: utc8DayStartMs - ZAI_UTC_OFFSET_MINUTES * 60_000,
      minuteOfDay: shiftedDate.getUTCHours() * 60 + shiftedDate.getUTCMinutes(),
      weekday: shiftedDate.getUTCDay(),
    }
  },

  resolvePeakInfo: (params: { nowMs: number; providerId: ProviderId }): IZaiPeakInfo | undefined => {
    if (params.providerId !== 'zai') {
      return undefined
    }

    const wallClock = zaiPeakUtil._resolveUtc8WallClock({ nowMs: params.nowMs })
    const isWeekday = wallClock.weekday >= WEEKDAY_FIRST && wallClock.weekday <= WEEKDAY_LAST
    const isWithinPeakHours =
      wallClock.minuteOfDay >= PEAK_START_MINUTE_OF_DAY && wallClock.minuteOfDay < PEAK_END_MINUTE_OF_DAY
    const peakStartMs = wallClock.dayStartMs + PEAK_START_MINUTE_OF_DAY * 60_000
    const peakEndMs = wallClock.dayStartMs + PEAK_END_MINUTE_OF_DAY * 60_000

    return {
      isPeakHour: isWeekday && isWithinPeakHours,
      peakEndsAtText: dateUtil.formatHourMinute(peakEndMs),
      peakWindowText: `${dateUtil.formatHourMinute(peakStartMs)}–${dateUtil.formatHourMinute(peakEndMs)}`,
    }
  },
}
