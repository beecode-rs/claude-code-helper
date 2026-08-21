export const usageSeverityUtil = {
  resolveSeverityColorVar: (percent: number): string => {
    if (percent < 70) {
      return 'var(--meter-accent)'
    }

    if (percent < 85) {
      return 'var(--meter-warning)'
    }

    if (percent < 95) {
      return 'var(--meter-serious)'
    }

    return 'var(--meter-critical)'
  },

  resolveSeverityLabel: (percent: number): string => {
    if (percent < 70) {
      return ''
    }

    if (percent < 85) {
      return 'Filling up'
    }

    if (percent < 95) {
      return 'High usage'
    }

    return 'Limit reached'
  },
}
