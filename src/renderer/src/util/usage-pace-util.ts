import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'

const PACE_RATIO_FULL_RED = 2
const PACE_RATIO_FULL_GREEN = 0.5

export const usagePaceUtil = {
  _resolvePaceColorForRatio: (params: { paceRatio: number }): string => {
    const { paceRatio } = params

    if (paceRatio >= PACE_RATIO_FULL_RED) {
      return 'var(--meter-critical)'
    }

    if (paceRatio > 1) {
      const criticalShare = Math.round((paceRatio - 1) * 100)

      return `color-mix(in srgb, var(--meter-critical) ${String(criticalShare)}%, var(--meter-accent))`
    }

    if (paceRatio <= PACE_RATIO_FULL_GREEN) {
      return 'var(--meter-good)'
    }

    if (paceRatio < 1) {
      const goodShare = Math.round(((1 - paceRatio) / (1 - PACE_RATIO_FULL_GREEN)) * 100)

      return `color-mix(in srgb, var(--meter-good) ${String(goodShare)}%, var(--meter-accent))`
    }

    return 'var(--meter-accent)'
  },

  _resolvePaceRatio: (params: { elapsedPercent: number; usedPercent: number }): number => {
    if (params.elapsedPercent <= 0) {
      if (params.usedPercent <= 0) {
        return 1
      }

      return PACE_RATIO_FULL_RED
    }

    return params.usedPercent / params.elapsedPercent
  },

  resolvePaceColor: (params: {
    now: number
    resetAt?: number
    usedPercent: number
    windowMs: number
  }): string | undefined => {
    if (params.resetAt === undefined) {
      return undefined
    }

    const remainingMs = usageResetUtil.resolveRemainingMs({ now: params.now, resetAt: params.resetAt })
    const elapsedPercent = usageResetUtil.resolveElapsedPercent({ remainingMs, windowMs: params.windowMs })
    const paceRatio = usagePaceUtil._resolvePaceRatio({ elapsedPercent, usedPercent: params.usedPercent })

    return usagePaceUtil._resolvePaceColorForRatio({ paceRatio })
  },
}
