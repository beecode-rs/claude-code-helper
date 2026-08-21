import { objectUtil } from '#src/main/util/object-util'
import { PROVIDER_CATALOG } from '#src/shared/provider-catalog'
import {
  ClaudeTokenSource,
  DEFAULT_POLL_INTERVAL_SECONDS,
  type IAppSettings,
  type IClaudeTrackerConfig,
  type ITrackerConfig,
  type IZaiTrackerConfig,
  MAX_POLL_INTERVAL_SECONDS,
  MIN_POLL_INTERVAL_SECONDS,
} from '#src/shared/settings-model'
import type { ProviderId } from '#src/shared/usage-model'

export class SettingsService {
  createDefaultSettings(): IAppSettings {
    return {
      pollIntervalSeconds: DEFAULT_POLL_INTERVAL_SECONDS,
      trackers: [],
    }
  }

  sanitizeSettings(params: { rawSettings: unknown }): IAppSettings {
    const rawRecord = objectUtil.asRecord(params.rawSettings)

    if (rawRecord === undefined) {
      return this.createDefaultSettings()
    }

    const rawTrackers = rawRecord['trackers']

    return {
      pollIntervalSeconds: this._resolveIntervalSeconds({ value: rawRecord['pollIntervalSeconds'] }),
      trackers: this._resolveTrackers({ rawRecord, rawTrackers }),
    }
  }

  protected _resolveTrackers(params: { rawRecord: Record<string, unknown>; rawTrackers: unknown }): ITrackerConfig[] {
    if (!Array.isArray(params.rawTrackers)) {
      return this._migrateLegacyTrackers({ rawRecord: params.rawRecord })
    }

    const trackers = params.rawTrackers
      .map((rawTracker) => {
        return this._sanitizeTracker({ rawTracker })
      })
      .filter((tracker): tracker is ITrackerConfig => {
        return tracker !== undefined
      })

    return this._ensureUniqueTrackerIds({ trackers })
  }

  protected _sanitizeTracker(params: { rawTracker: unknown }): ITrackerConfig | undefined {
    const rawTracker = objectUtil.asRecord(params.rawTracker)

    if (rawTracker === undefined) {
      return undefined
    }

    return this._sanitizeTrackerByProviderId({ providerId: rawTracker['providerId'], rawTracker })
  }

  protected _sanitizeTrackerByProviderId(params: {
    providerId: unknown
    rawTracker: Record<string, unknown>
  }): ITrackerConfig | undefined {
    switch (params.providerId) {
      case 'claude': {
        return {
          accessToken: this._resolveStringValue({ fallback: '', value: params.rawTracker['accessToken'] }),
          id: this._resolveTrackerId({ value: params.rawTracker['id'] }),
          name: this._resolveTrackerName({ providerId: 'claude', value: params.rawTracker['name'] }),
          providerId: 'claude',
          tokenSource: this._resolveTokenSource({ value: params.rawTracker['tokenSource'] }),
        }
      }

      case 'zai': {
        return {
          accessToken: this._resolveStringValue({ fallback: '', value: params.rawTracker['accessToken'] }),
          id: this._resolveTrackerId({ value: params.rawTracker['id'] }),
          name: this._resolveTrackerName({ providerId: 'zai', value: params.rawTracker['name'] }),
          providerId: 'zai',
        }
      }

      default: {
        return undefined
      }
    }
  }

  protected _migrateLegacyTrackers(params: { rawRecord: Record<string, unknown> }): ITrackerConfig[] {
    const claudeConfig = this._migrateLegacyClaudeTracker({ rawRecord: params.rawRecord })
    const zaiConfig = this._migrateLegacyZaiTracker({ rawRecord: params.rawRecord })

    return [claudeConfig, zaiConfig].filter((tracker): tracker is ITrackerConfig => {
      return tracker !== undefined
    })
  }

  protected _migrateLegacyClaudeTracker(params: {
    rawRecord: Record<string, unknown>
  }): IClaudeTrackerConfig | undefined {
    const claudeToken = this._resolveStringValue({ fallback: '', value: params.rawRecord['claudeAccessToken'] })
    const tokenSource = this._resolveTokenSource({ value: params.rawRecord['claudeTokenSource'] })

    if (claudeToken === '' && tokenSource === ClaudeTokenSource.MANUAL) {
      return undefined
    }

    return {
      accessToken: claudeToken,
      id: crypto.randomUUID(),
      name: 'Claude',
      providerId: 'claude',
      tokenSource,
    }
  }

  protected _migrateLegacyZaiTracker(params: { rawRecord: Record<string, unknown> }): IZaiTrackerConfig | undefined {
    const zaiToken = this._resolveStringValue({ fallback: '', value: params.rawRecord['zaiAccessToken'] })

    if (zaiToken === '') {
      return undefined
    }

    return {
      accessToken: zaiToken,
      id: crypto.randomUUID(),
      name: 'z.ai',
      providerId: 'zai',
    }
  }

  protected _ensureUniqueTrackerIds(params: { trackers: ITrackerConfig[] }): ITrackerConfig[] {
    const seenIds = new Set<string>()

    return params.trackers.map((tracker) => {
      if (seenIds.has(tracker.id)) {
        return { ...tracker, id: crypto.randomUUID() }
      }

      seenIds.add(tracker.id)

      return tracker
    })
  }

  protected _resolveTrackerId(params: { value: unknown }): string {
    if (typeof params.value !== 'string' || params.value === '') {
      return crypto.randomUUID()
    }

    return params.value
  }

  protected _resolveTrackerName(params: { providerId: ProviderId; value: unknown }): string {
    if (typeof params.value === 'string' && params.value !== '') {
      return params.value
    }

    const catalogEntry = PROVIDER_CATALOG.find((entry) => {
      return entry.id === params.providerId
    })

    if (catalogEntry === undefined) {
      return params.providerId
    }

    return catalogEntry.name
  }

  protected _resolveStringValue(params: { fallback: string; value: unknown }): string {
    if (typeof params.value !== 'string') {
      return params.fallback
    }

    return params.value
  }

  protected _resolveTokenSource(params: { value: unknown }): ClaudeTokenSource {
    if (params.value === ClaudeTokenSource.SYSTEM) {
      return ClaudeTokenSource.SYSTEM
    }

    return ClaudeTokenSource.MANUAL
  }

  protected _resolveIntervalSeconds(params: { value: unknown }): number {
    if (typeof params.value !== 'number' || !Number.isFinite(params.value)) {
      return DEFAULT_POLL_INTERVAL_SECONDS
    }

    const clampedInterval = Math.min(Math.max(params.value, MIN_POLL_INTERVAL_SECONDS), MAX_POLL_INTERVAL_SECONDS)

    return Math.round(clampedInterval)
  }
}
