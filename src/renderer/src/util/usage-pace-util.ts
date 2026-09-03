import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'

const OUTPACING_MIN_DRIFT_PERCENT = 10
const PACE_ON_PACE_BAND_PERCENT = 5
const PACE_STEP_MAX_COUNT = 5
const PACE_STEP_PERCENT = 20

export const usagePaceUtil = {
  _resolveDiffPercent: (params: {
    now: number
    resetAt?: number
    usedPercent: number
    windowMs: number
  }): number | undefined => {
    if (params.resetAt === undefined) {
      return undefined
    }

    const remainingMs = usageResetUtil.resolveRemainingMs({ now: params.now, resetAt: params.resetAt })
    const elapsedPercent = usageResetUtil.resolveElapsedPercent({ remainingMs, windowMs: params.windowMs })

    return params.usedPercent - elapsedPercent
  },

  _resolvePaceColorForDiff: (params: { diffPercent: number }): string => {
    const { diffPercent } = params

    if (Math.abs(diffPercent) <= PACE_ON_PACE_BAND_PERCENT) {
      return 'var(--meter-accent)'
    }

    const stepCount = usagePaceUtil._resolvePaceStepCount({ diffPercent })

    if (diffPercent > 0) {
      return usagePaceUtil._resolvePaceStepColorVar({ paceDirection: 'red', stepCount })
    }

    return usagePaceUtil._resolvePaceStepColorVar({ paceDirection: 'green', stepCount })
  },

  _resolvePaceStepColorVar: (params: { paceDirection: 'green' | 'red'; stepCount: number }): string => {
    return `var(--pace-${params.paceDirection}-${String(params.stepCount)})`
  },

  _resolvePaceStepCount: (params: { diffPercent: number }): number => {
    const driftBeyondBandPercent = Math.abs(params.diffPercent) - PACE_ON_PACE_BAND_PERCENT

    return Math.min(Math.ceil(driftBeyondBandPercent / PACE_STEP_PERCENT), PACE_STEP_MAX_COUNT)
  },

  resolveIsUsageOutpacingWindow: (params: {
    now: number
    resetAt?: number
    usedPercent: number
    windowMs: number
  }): boolean => {
    const diffPercent = usagePaceUtil._resolveDiffPercent(params)

    if (diffPercent === undefined) {
      return false
    }

    return diffPercent >= OUTPACING_MIN_DRIFT_PERCENT
  },

  resolvePaceColor: (params: {
    now: number
    resetAt?: number
    usedPercent: number
    windowMs: number
  }): string | undefined => {
    const diffPercent = usagePaceUtil._resolveDiffPercent(params)

    if (diffPercent === undefined) {
      return undefined
    }

    return usagePaceUtil._resolvePaceColorForDiff({ diffPercent })
  },
}
