import { objectUtil } from '#src/main/util/object-util'
import { PROVIDER_CATALOG } from '#src/shared/provider-catalog'
import {
  ClaudeTokenSource,
  type IAppSettings,
  type IClaudeTrackerConfig,
  type ITrackerConfig,
  type IZaiTrackerConfig,
  MAX_REFRESH_INTERVAL_SECONDS,
  MIN_REFRESH_INTERVAL_SECONDS,
} from '#src/shared/settings-model'
import {
  DEFAULT_TRIGGER_TIMEOUT_MS,
  type ITriggerConfig,
  MAX_TRIGGER_TIMEOUT_MS,
  MIN_TRIGGER_TIMEOUT_MS,
  TRIGGER_DAYS,
  TRIGGER_TIME_PATTERN,
  type TriggerDay,
} from '#src/shared/trigger-model'
import type { ProviderId } from '#src/shared/usage-model'

export class SettingsService {
  createDefaultSettings(): IAppSettings {
    return {
      trackers: [],
      triggers: [],
    }
  }

  sanitizeSettings(params: { rawSettings: unknown }): IAppSettings {
    const rawRecord = objectUtil.asRecord(params.rawSettings)

    if (rawRecord === undefined) {
      return this.createDefaultSettings()
    }

    const rawTrackers = rawRecord['trackers']
    const rawTriggers = rawRecord['triggers']

    return {
      trackers: this._resolveTrackers({ rawRecord, rawTrackers }),
      triggers: this._resolveTriggers({ rawTriggers }),
    }
  }

  setTrackerPaused(params: { isAutoRefreshPaused: boolean; settings: IAppSettings; trackerId: string }): IAppSettings {
    return {
      ...params.settings,
      trackers: params.settings.trackers.map((tracker) => {
        if (tracker.id !== params.trackerId) {
          return tracker
        }

        return { ...tracker, isAutoRefreshPaused: params.isAutoRefreshPaused }
      }),
    }
  }

  setTriggerEnabled(params: { isEnabled: boolean; settings: IAppSettings; triggerId: string }): IAppSettings {
    return {
      ...params.settings,
      triggers: params.settings.triggers.map((trigger) => {
        if (trigger.id !== params.triggerId) {
          return trigger
        }

        return { ...trigger, isEnabled: params.isEnabled }
      }),
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
          isAutoRefreshPaused: this._resolveIsAutoRefreshPaused({ value: params.rawTracker['isAutoRefreshPaused'] }),
          name: this._resolveTrackerName({ providerId: 'claude', value: params.rawTracker['name'] }),
          providerId: 'claude',
          refreshIntervalSeconds: this._resolveRefreshIntervalSeconds({
            providerId: 'claude',
            value: params.rawTracker['refreshIntervalSeconds'],
          }),
          tokenSource: this._resolveTokenSource({ value: params.rawTracker['tokenSource'] }),
        }
      }

      case 'zai': {
        return {
          accessToken: this._resolveStringValue({ fallback: '', value: params.rawTracker['accessToken'] }),
          id: this._resolveTrackerId({ value: params.rawTracker['id'] }),
          isAutoRefreshPaused: this._resolveIsAutoRefreshPaused({ value: params.rawTracker['isAutoRefreshPaused'] }),
          name: this._resolveTrackerName({ providerId: 'zai', value: params.rawTracker['name'] }),
          providerId: 'zai',
          refreshIntervalSeconds: this._resolveRefreshIntervalSeconds({
            providerId: 'zai',
            value: params.rawTracker['refreshIntervalSeconds'],
          }),
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
      isAutoRefreshPaused: false,
      name: 'Claude',
      providerId: 'claude',
      refreshIntervalSeconds: this._resolveRefreshIntervalSeconds({ providerId: 'claude', value: undefined }),
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
      isAutoRefreshPaused: false,
      name: 'z.ai',
      providerId: 'zai',
      refreshIntervalSeconds: this._resolveRefreshIntervalSeconds({ providerId: 'zai', value: undefined }),
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

  protected _resolveTriggers(params: { rawTriggers: unknown }): ITriggerConfig[] {
    if (!Array.isArray(params.rawTriggers)) {
      return []
    }

    const triggers = params.rawTriggers
      .map((rawTrigger) => {
        return this._sanitizeTrigger({ rawTrigger })
      })
      .filter((trigger): trigger is ITriggerConfig => {
        return trigger !== undefined
      })

    return this._ensureUniqueTriggerIds({ triggers })
  }

  protected _sanitizeTrigger(params: { rawTrigger: unknown }): ITriggerConfig | undefined {
    const rawTrigger = objectUtil.asRecord(params.rawTrigger)

    if (rawTrigger === undefined) {
      return undefined
    }

    const command = this._resolveTriggerCommand({ value: rawTrigger['command'] })
    const days = this._resolveTriggerDays({ value: rawTrigger['days'] })
    const times = this._resolveTriggerTimes({ value: rawTrigger['times'] })

    if (command === undefined || days.length === 0 || times.length === 0) {
      return undefined
    }

    return {
      command,
      createdAt: this._resolveTriggerCreatedAt({ value: rawTrigger['createdAt'] }),
      days,
      id: this._resolveTriggerId({ value: rawTrigger['id'] }),
      isEnabled: this._resolveIsTriggerEnabled({ value: rawTrigger['isEnabled'] }),
      name: this._resolveTriggerName({ value: rawTrigger['name'] }),
      timeoutMs: this._resolveTriggerTimeoutMs({ value: rawTrigger['timeoutMs'] }),
      times,
    }
  }

  protected _ensureUniqueTriggerIds(params: { triggers: ITriggerConfig[] }): ITriggerConfig[] {
    const seenIds = new Set<string>()

    return params.triggers.map((trigger) => {
      if (seenIds.has(trigger.id)) {
        return { ...trigger, id: crypto.randomUUID() }
      }

      seenIds.add(trigger.id)

      return trigger
    })
  }

  protected _resolveTriggerCommand(params: { value: unknown }): string | undefined {
    if (typeof params.value !== 'string' || params.value.trim() === '') {
      return undefined
    }

    return params.value.trim()
  }

  protected _resolveTriggerCreatedAt(params: { value: unknown }): number {
    if (typeof params.value !== 'number' || !Number.isFinite(params.value)) {
      return Date.now()
    }

    return params.value
  }

  protected _resolveTriggerDays(params: { value: unknown }): TriggerDay[] {
    if (!Array.isArray(params.value)) {
      return []
    }

    const knownDays = new Set<string>(TRIGGER_DAYS)
    const selectedDays = new Set<TriggerDay>(
      params.value.filter((day): day is TriggerDay => {
        return typeof day === 'string' && knownDays.has(day)
      }),
    )

    return TRIGGER_DAYS.filter((day) => {
      return selectedDays.has(day)
    })
  }

  protected _resolveTriggerId(params: { value: unknown }): string {
    if (typeof params.value !== 'string' || params.value === '') {
      return crypto.randomUUID()
    }

    return params.value
  }

  protected _resolveTriggerName(params: { value: unknown }): string {
    if (typeof params.value === 'string' && params.value.trim() !== '') {
      return params.value.trim()
    }

    return 'Trigger'
  }

  protected _resolveTriggerTimes(params: { value: unknown }): string[] {
    if (!Array.isArray(params.value)) {
      return []
    }

    const times = params.value.filter((time): time is string => {
      return typeof time === 'string' && TRIGGER_TIME_PATTERN.test(time)
    })

    return [...new Set(times)].sort()
  }

  protected _resolveTriggerTimeoutMs(params: { value: unknown }): number {
    if (typeof params.value !== 'number' || !Number.isFinite(params.value)) {
      return DEFAULT_TRIGGER_TIMEOUT_MS
    }

    const clampedTimeoutMs = Math.min(Math.max(params.value, MIN_TRIGGER_TIMEOUT_MS), MAX_TRIGGER_TIMEOUT_MS)

    return Math.round(clampedTimeoutMs)
  }

  protected _resolveIsTriggerEnabled(params: { value: unknown }): boolean {
    return params.value === true
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

  protected _resolveIsAutoRefreshPaused(params: { value: unknown }): boolean {
    if (params.value === true) {
      return true
    }

    return false
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

  protected _resolveRefreshIntervalSeconds(params: { providerId: ProviderId; value: unknown }): number {
    if (typeof params.value !== 'number' || !Number.isFinite(params.value)) {
      return this._resolveDefaultRefreshIntervalSeconds({ providerId: params.providerId })
    }

    const clampedIntervalSeconds = Math.min(
      Math.max(params.value, MIN_REFRESH_INTERVAL_SECONDS),
      MAX_REFRESH_INTERVAL_SECONDS,
    )

    return Math.round(clampedIntervalSeconds)
  }

  protected _resolveDefaultRefreshIntervalSeconds(params: { providerId: ProviderId }): number {
    const catalogEntry = PROVIDER_CATALOG.find((entry) => {
      return entry.id === params.providerId
    })

    if (catalogEntry === undefined) {
      return MIN_REFRESH_INTERVAL_SECONDS
    }

    return catalogEntry.defaultRefreshIntervalSeconds
  }
}
