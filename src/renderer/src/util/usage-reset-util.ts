import { dateUtil } from '#src/renderer/src/util/date-util'

const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000

export const usageResetUtil = {
  fiveHourWindowMs: FIVE_HOUR_WINDOW_MS,

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
