export const usageWindowUtil = {
  resolveValueText: (params: {
    totalAmount?: number
    usedAmount?: number
    usedPercent: number
  }): string | undefined => {
    if (params.usedAmount === undefined || params.totalAmount === undefined) {
      return undefined
    }

    return `${String(Math.round(params.usedPercent))}% · ${String(params.usedAmount)} / ${String(params.totalAmount)}`
  },
}
