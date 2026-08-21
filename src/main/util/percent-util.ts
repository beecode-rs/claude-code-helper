export const percentUtil = {
  clampPercent: (value: number): number => {
    if (value < 0) {
      return 0
    }

    if (value > 100) {
      return 100
    }

    return value
  },

  roundPercentToOneDecimal: (value: number): number => {
    return Math.round(value * 10) / 10
  },
}
