import { type IUsageProvider } from '#src/main/business/service/usage-provider/usage-provider'
import { httpUtil } from '#src/main/util/http-util'
import { objectUtil } from '#src/main/util/object-util'
import { percentUtil } from '#src/main/util/percent-util'
import { FIVE_HOUR_WINDOW_MS, type IUsageWindow, type ProviderId } from '#src/shared/usage-model'

export class UsageProviderClaude implements IUsageProvider {
  protected readonly _usageUrl = 'https://api.anthropic.com/api/oauth/usage'

  getProviderId(): ProviderId {
    return 'claude'
  }

  async fetchUsage(params: { accessToken: string }): Promise<IUsageWindow[]> {
    const rawUsage = await httpUtil.fetchJson({
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${params.accessToken}`,
      },
      url: this._usageUrl,
    })
    const usageRecord = this._extractUsageRecord({ raw: rawUsage })

    return this._buildWindows({ usageRecord })
  }

  protected _extractUsageRecord(params: { raw: unknown }): Record<string, unknown> {
    const rootRecord = objectUtil.asRecord(params.raw)

    if (rootRecord === undefined) {
      throw new Error('Claude usage response is not a JSON object')
    }

    return rootRecord
  }

  protected _buildWindows(params: { usageRecord: Record<string, unknown> }): IUsageWindow[] {
    const fiveHourWindow = this._buildWindow({
      label: '5-hour window',
      sectionRecord: objectUtil.asRecord(params.usageRecord['five_hour']),
      windowMs: FIVE_HOUR_WINDOW_MS,
    })

    if (fiveHourWindow === undefined) {
      throw new Error("Claude usage response is missing the 'five_hour' section")
    }

    const windows: IUsageWindow[] = [fiveHourWindow]
    const sevenDayWindow = this._buildWindow({
      label: 'Weekly',
      sectionRecord: objectUtil.asRecord(params.usageRecord['seven_day']),
    })

    if (sevenDayWindow !== undefined) {
      windows.push(sevenDayWindow)
    }

    return windows
  }

  protected _buildWindow(params: {
    label: string
    sectionRecord?: Record<string, unknown>
    windowMs?: number
  }): IUsageWindow | undefined {
    if (params.sectionRecord === undefined) {
      return undefined
    }

    const percent = this._resolvePercent({ sectionRecord: params.sectionRecord })

    if (percent === undefined) {
      return undefined
    }

    const resetAt = this._resolveResetAt({ sectionRecord: params.sectionRecord })

    if (resetAt === undefined) {
      if (params.windowMs === undefined) {
        return { label: params.label, usedPercent: percent }
      }

      return { label: params.label, usedPercent: percent, windowMs: params.windowMs }
    }

    if (params.windowMs === undefined) {
      return { label: params.label, resetAt, usedPercent: percent }
    }

    return { label: params.label, resetAt, usedPercent: percent, windowMs: params.windowMs }
  }

  protected _resolvePercent(params: { sectionRecord: Record<string, unknown> }): number | undefined {
    const utilization = params.sectionRecord['utilization']

    if (typeof utilization !== 'number' || !Number.isFinite(utilization)) {
      return undefined
    }

    return percentUtil.roundPercentToOneDecimal(percentUtil.clampPercent(utilization))
  }

  protected _resolveResetAt(params: { sectionRecord: Record<string, unknown> }): number | undefined {
    const resetsAt = params.sectionRecord['resets_at']

    if (typeof resetsAt !== 'string' && typeof resetsAt !== 'number') {
      return undefined
    }

    const resetDate = new Date(resetsAt)

    if (Number.isNaN(resetDate.getTime())) {
      return undefined
    }

    return resetDate.getTime()
  }
}
