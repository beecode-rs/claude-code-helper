import { dateUtil } from '#src/renderer/src/util/date-util'

const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000

export const usageResetUtil = {
  fiveHourWindowMs: FIVE_HOUR_WINDOW_MS,

  resolveElapsedPercent: (params: { remainingMs: number }): number => {
    const elapsedFraction = 1 - params.remainingMs / FIVE_HOUR_WINDOW_MS

    return Math.min(Math.max(elapsedFraction, 0), 1) * 100
  },

  resolveRemainingMs: (params: { now: number; resetAt?: number }): number => {
    if (params.resetAt === undefined) {
      return 0
    }

    return Math.max(0, params.resetAt - params.now)
  },

  resolveRemainingText: (params: { remainingMs: number }): string => {
    if (params.remainingMs <= 0) {
      return 'now'
    }

    return dateUtil.formatDuration(params.remainingMs)
  },

  resolveWindowStartedAt: (params: { resetAt?: number }): number | undefined => {
    if (params.resetAt === undefined) {
      return undefined
    }

    return params.resetAt - FIVE_HOUR_WINDOW_MS
  },
}
