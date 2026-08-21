import { objectUtil } from '#src/main/util/object-util'
import {
  DEFAULT_POLL_INTERVAL_SECONDS,
  type IAppSettings,
  MAX_POLL_INTERVAL_SECONDS,
  MIN_POLL_INTERVAL_SECONDS,
} from '#src/shared/settings-model'

export class SettingsService {
  createDefaultSettings(): IAppSettings {
    return {
      claudeAccessToken: '',
      pollIntervalSeconds: DEFAULT_POLL_INTERVAL_SECONDS,
      zaiAccessToken: '',
    }
  }

  sanitizeSettings(params: { rawSettings: unknown }): IAppSettings {
    const rawRecord = objectUtil.asRecord(params.rawSettings)

    if (rawRecord === undefined) {
      return this.createDefaultSettings()
    }

    const defaultSettings = this.createDefaultSettings()

    return {
      claudeAccessToken: this._resolveStringValue({
        fallback: defaultSettings.claudeAccessToken,
        value: rawRecord['claudeAccessToken'],
      }),
      pollIntervalSeconds: this._resolveIntervalSeconds({ value: rawRecord['pollIntervalSeconds'] }),
      zaiAccessToken: this._resolveStringValue({
        fallback: defaultSettings.zaiAccessToken,
        value: rawRecord['zaiAccessToken'],
      }),
    }
  }

  protected _resolveStringValue(params: { fallback: string; value: unknown }): string {
    if (typeof params.value !== 'string') {
      return params.fallback
    }

    return params.value
  }

  protected _resolveIntervalSeconds(params: { value: unknown }): number {
    if (typeof params.value !== 'number' || !Number.isFinite(params.value)) {
      return DEFAULT_POLL_INTERVAL_SECONDS
    }

    const clampedInterval = Math.min(Math.max(params.value, MIN_POLL_INTERVAL_SECONDS), MAX_POLL_INTERVAL_SECONDS)

    return Math.round(clampedInterval)
  }
}
