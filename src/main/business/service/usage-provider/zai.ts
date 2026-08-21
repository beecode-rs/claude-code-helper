import { type IUsageProvider } from '#src/main/business/service/usage-provider/usage-provider'
import { httpUtil } from '#src/main/util/http-util'
import { objectUtil } from '#src/main/util/object-util'
import { percentUtil } from '#src/main/util/percent-util'
import { type IHourlyUsageBucket, zaiWindowUtil } from '#src/main/util/zai-window-util'
import { type IProviderUsage, type IUsageWindow, type ProviderId } from '#src/shared/usage-model'

const MODEL_USAGE_RANGE_MS = 24 * 60 * 60 * 1000

export class UsageProviderZai implements IUsageProvider {
  protected readonly _modelUsageUrl = 'https://api.z.ai/api/monitor/usage/model-usage'
  protected readonly _quotaLimitUrl = 'https://api.z.ai/api/monitor/usage/quota/limit'

  getProviderId(): ProviderId {
    return 'zai'
  }

  getProviderName(): string {
    return 'z.ai'
  }

  async fetchUsage(params: { accessToken: string }): Promise<IProviderUsage> {
    const headers = Object.fromEntries([
      ['Accept-Language', 'en-US,en'],
      ['Authorization', params.accessToken],
      ['Content-Type', 'application/json'],
    ])
    const [rawQuota, rawModelUsage] = await Promise.all([
      httpUtil.fetchJson({ headers, url: this._quotaLimitUrl }),
      this._fetchModelUsage({ headers }),
    ])
    const limits = this._extractLimits({ raw: rawQuota })
    const estimatedResetAt = this._resolveEstimatedResetAt({ raw: rawModelUsage })

    return this._buildUsage({ estimatedResetAt, limits })
  }

  protected async _fetchModelUsage(params: { headers: Record<string, string> }): Promise<unknown> {
    const query = new URLSearchParams({
      endTime: this._formatApiDateTime({ date: new Date() }),
      startTime: this._formatApiDateTime({ date: new Date(Date.now() - MODEL_USAGE_RANGE_MS) }),
    })

    try {
      return await httpUtil.fetchJson({
        headers: params.headers,
        url: `${this._modelUsageUrl}?${query.toString()}`,
      })
    } catch {
      return undefined
    }
  }

  protected _formatApiDateTime(params: { date: Date }): string {
    const year = params.date.getFullYear()
    const month = this._padTwo(params.date.getMonth() + 1)
    const day = this._padTwo(params.date.getDate())
    const hours = this._padTwo(params.date.getHours())
    const minutes = this._padTwo(params.date.getMinutes())
    const seconds = this._padTwo(params.date.getSeconds())

    return `${String(year)}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  protected _padTwo(value: number): string {
    return String(value).padStart(2, '0')
  }

  protected _extractLimits(params: { raw: unknown }): unknown[] {
    const dataRecord = this._extractDataRecord({ raw: params.raw })

    if (dataRecord === undefined) {
      throw new Error('z.ai usage response is missing the data object')
    }

    const limits = dataRecord['limits']

    if (!Array.isArray(limits)) {
      throw new Error('z.ai usage response is missing the limits array')
    }

    return limits
  }

  protected _extractDataRecord(params: { raw: unknown }): Record<string, unknown> | undefined {
    const rootRecord = objectUtil.asRecord(params.raw)

    if (rootRecord === undefined) {
      return undefined
    }

    return objectUtil.asRecord(rootRecord['data'])
  }

  protected _resolveEstimatedResetAt(params: { raw: unknown }): number | undefined {
    const buckets = this._extractHourlyBuckets({ raw: params.raw })

    return zaiWindowUtil.resolveEstimatedResetAt({ buckets, now: Date.now() })
  }

  protected _extractHourlyBuckets(params: { raw: unknown }): IHourlyUsageBucket[] {
    const dataRecord = this._extractDataRecord({ raw: params.raw })

    if (dataRecord === undefined) {
      return []
    }

    const labels = dataRecord['x_time']
    const tokensUsages = dataRecord['tokensUsage']

    if (!Array.isArray(labels) || !Array.isArray(tokensUsages)) {
      return []
    }

    return labels
      .map((label, index) => {
        return this._buildBucket({ label, tokensUsage: tokensUsages[index] })
      })
      .filter((bucket): bucket is IHourlyUsageBucket => {
        return bucket !== undefined
      })
  }

  protected _buildBucket(params: { label: unknown; tokensUsage: unknown }): IHourlyUsageBucket | undefined {
    if (typeof params.label !== 'string') {
      return undefined
    }

    const startedAt = this._parseHourLabel(params.label)

    if (startedAt === undefined) {
      return undefined
    }

    return { startedAt, tokensUsed: this._resolveTokensUsed(params.tokensUsage) }
  }

  protected _resolveTokensUsed(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0
    }

    return value
  }

  protected _parseHourLabel(label: string): number | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(label)

    if (match === null) {
      return undefined
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]))

    if (Number.isNaN(date.getTime())) {
      return undefined
    }

    return date.getTime()
  }

  protected _buildUsage(params: { estimatedResetAt?: number; limits: unknown[] }): IProviderUsage {
    const windows = [
      this._buildWindow({
        estimatedResetAt: params.estimatedResetAt,
        expectedLabel: '5-hour window',
        limits: params.limits,
        limitType: 'TOKENS_LIMIT',
      }),
      this._buildWindow({ expectedLabel: 'Monthly', limits: params.limits, limitType: 'TIME_LIMIT' }),
    ].filter((window) => {
      return window !== undefined
    })

    if (windows.length === 0) {
      throw new Error('z.ai usage response contains no recognizable quota limits')
    }

    return { providerId: 'zai', providerName: this.getProviderName(), windows }
  }

  protected _buildWindow(params: {
    estimatedResetAt?: number
    expectedLabel: string
    limitType: string
    limits: unknown[]
  }): IUsageWindow | undefined {
    const percent = this._findLimitPercent({ limits: params.limits, limitType: params.limitType })

    if (percent === undefined) {
      return undefined
    }

    if (params.estimatedResetAt === undefined) {
      return { label: params.expectedLabel, usedPercent: percent }
    }

    return { estimatedResetAt: params.estimatedResetAt, label: params.expectedLabel, usedPercent: percent }
  }

  protected _findLimitPercent(params: { limitType: string; limits: unknown[] }): number | undefined {
    const matchingLimit = params.limits.find((limit) => {
      const limitRecord = objectUtil.asRecord(limit)

      if (limitRecord === undefined) {
        return false
      }

      return limitRecord['type'] === params.limitType
    })
    const limitRecord = objectUtil.asRecord(matchingLimit)

    if (limitRecord === undefined) {
      return undefined
    }

    const percent = limitRecord['percentage']

    if (typeof percent !== 'number' || !Number.isFinite(percent)) {
      return undefined
    }

    return percentUtil.roundPercentToOneDecimal(percentUtil.clampPercent(percent))
  }
}
