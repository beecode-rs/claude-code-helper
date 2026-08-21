import { dateUtil } from '#src/renderer/src/util/date-util'

export const usageResetUtil = {
  resolveRemainingText: (params: { remainingMs: number }): string => {
    if (params.remainingMs <= 0) {
      return 'now'
    }

    return `~${dateUtil.formatDuration(params.remainingMs)}`
  },
}
