const HOUR_MS = 60 * 60 * 1000
const WINDOW_MS = 5 * HOUR_MS

export interface IHourlyUsageBucket {
  startedAt: number
  tokensUsed: number
}

export const zaiWindowUtil = {
  resolveEstimatedResetAt(params: { buckets: IHourlyUsageBucket[]; now: number }): number | undefined {
    const earliestPossibleStart = params.now - WINDOW_MS
    const sortedBuckets = [...params.buckets].sort((left, right) => {
      return left.startedAt - right.startedAt
    })
    const activeBuckets = sortedBuckets.filter((bucket) => {
      const bucketEnd = bucket.startedAt + HOUR_MS
      const intersectsWindowSpan = bucketEnd > earliestPossibleStart && bucket.startedAt <= params.now

      return intersectsWindowSpan && bucket.tokensUsed > 0
    })
    const firstActiveBucket = activeBuckets[0]

    if (firstActiveBucket === undefined) {
      return undefined
    }

    const estimatedWindowStart = firstActiveBucket.startedAt + HOUR_MS

    return estimatedWindowStart + WINDOW_MS
  },
}
