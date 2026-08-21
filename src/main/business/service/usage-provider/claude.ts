import { type IUsageProvider } from '#src/main/business/service/usage-provider/usage-provider'
import { httpUtil } from '#src/main/util/http-util'
import { objectUtil } from '#src/main/util/object-util'
import { percentUtil } from '#src/main/util/percent-util'
import { type IProviderUsage, type IUsageWindow, type ProviderId } from '#src/shared/usage-model'

export class UsageProviderClaude implements IUsageProvider {
  protected readonly _fiveHourFieldNames = [
    'five_hour_slot_usage_percentage',
    'fiveHourSlotUsagePercentage',
    'five_hour_usage_percentage',
    'fiveHourUsagePercentage',
    'session_usage_percentage',
    'sessionUsagePercentage',
  ]

  protected readonly _sevenDayFieldNames = [
    'seven_day_window_usage_percentage',
    'sevenDayWindowUsagePercentage',
    'weekly_usage_percentage',
    'weeklyUsagePercentage',
    'seven_day_usage_percentage',
    'sevenDayUsagePercentage',
  ]

  protected readonly _usageUrl = 'https://api.claude.com/api/usage'

  getProviderId(): ProviderId {
    return 'claude'
  }

  getProviderName(): string {
    return 'Claude'
  }

  async fetchUsage(params: { accessToken: string }): Promise<IProviderUsage> {
    const rawUsage = await httpUtil.fetchJson({
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${params.accessToken}`,
      },
      url: this._usageUrl,
    })
    const fiveHourPercent = this._findPercentByFieldNames({
      fieldNames: this._fiveHourFieldNames,
      raw: rawUsage,
    })

    const windows: IUsageWindow[] = [{ label: '5-hour window', usedPercent: fiveHourPercent }]
    const sevenDayPercent = this._findOptionalPercentByFieldNames({
      fieldNames: this._sevenDayFieldNames,
      raw: rawUsage,
    })

    if (sevenDayPercent !== undefined) {
      windows.push({ label: 'Weekly', usedPercent: sevenDayPercent })
    }

    return { providerId: 'claude', providerName: this.getProviderName(), windows }
  }

  protected _findPercentByFieldNames(params: { fieldNames: string[]; raw: unknown }): number {
    const percent = this._findOptionalPercentByFieldNames(params)

    if (percent === undefined) {
      throw new Error(`Claude usage response is missing any of the expected fields: ${params.fieldNames.join(', ')}`)
    }

    return percent
  }

  protected _findOptionalPercentByFieldNames(params: { fieldNames: string[]; raw: unknown }): number | undefined {
    const searchableRecords = this._collectSearchableRecords(params.raw)
    const foundPercent = params.fieldNames
      .map((fieldName) => {
        return this._findNumericField({ fieldName, records: searchableRecords })
      })
      .find((percent) => {
        return percent !== undefined
      })

    if (foundPercent === undefined) {
      return undefined
    }

    return percentUtil.roundPercentToOneDecimal(percentUtil.clampPercent(foundPercent))
  }

  protected _collectSearchableRecords(raw: unknown): Record<string, unknown>[] {
    const rootRecord = objectUtil.asRecord(raw)

    if (rootRecord === undefined) {
      return []
    }

    const nestedRecords = Object.values(rootRecord).flatMap((value) => {
      const nestedRecord = objectUtil.asRecord(value)

      if (nestedRecord === undefined) {
        return []
      }

      return [nestedRecord]
    })

    return [rootRecord, ...nestedRecords]
  }

  protected _findNumericField(params: { fieldName: string; records: Record<string, unknown>[] }): number | undefined {
    const numericValue = params.records
      .map((record) => {
        return record[params.fieldName]
      })
      .find((value): value is number => {
        return typeof value === 'number' && Number.isFinite(value)
      })

    return numericValue
  }
}
