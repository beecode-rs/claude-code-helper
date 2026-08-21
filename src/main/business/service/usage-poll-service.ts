import { ClaudeSystemTokenService } from '#src/main/business/service/claude-system-token-service'
import { UsageProviderClaude } from '#src/main/business/service/usage-provider/claude'
import { type IUsageProvider } from '#src/main/business/service/usage-provider/usage-provider'
import { UsageProviderZai } from '#src/main/business/service/usage-provider/zai'
import { errorUtil } from '#src/main/util/error-util'
import { ClaudeTokenSource, type IAppSettings, type ITrackerConfig } from '#src/shared/settings-model'
import {
  type IProviderSnapshot,
  type IUsageSnapshot,
  type ProviderId,
  UsageStatus,
  type UsageUpdateListener,
} from '#src/shared/usage-model'

export class UsagePollService {
  protected _generationByTrackerId: Map<string, number> = new Map()
  protected _listeners: UsageUpdateListener[] = []
  protected _nextPollAtByTrackerId: Map<string, number> = new Map()
  protected _settings: IAppSettings | undefined
  protected _snapshotByTrackerId: Map<string, IProviderSnapshot> = new Map()
  protected _timerByTrackerId: Map<string, NodeJS.Timeout> = new Map()
  protected readonly _isDevelopment: boolean
  protected readonly _claudeSystemTokenService: ClaudeSystemTokenService
  protected readonly _providers: Record<ProviderId, IUsageProvider>

  constructor(params?: {
    claudeSystemTokenService?: ClaudeSystemTokenService
    isDevelopment?: boolean
    providers?: Record<ProviderId, IUsageProvider>
  }) {
    const {
      claudeSystemTokenService = new ClaudeSystemTokenService(),
      isDevelopment = false,
      providers = this._createDefaultProviders(),
    } = params ?? {}

    this._claudeSystemTokenService = claudeSystemTokenService
    this._isDevelopment = isDevelopment
    this._providers = providers
  }

  async start(params: { settings: IAppSettings }): Promise<void> {
    this._settings = params.settings

    if (this._isDevelopment) {
      this._scheduleAllTrackers()
      return
    }

    await this.refreshNow()
  }

  async restart(params: { settings: IAppSettings }): Promise<void> {
    this.stop()
    this._settings = params.settings
    await this.refreshNow()
  }

  stop(): void {
    this._timerByTrackerId.forEach((timer) => {
      clearTimeout(timer)
    })
    this._timerByTrackerId.clear()
  }

  async refreshNow(): Promise<void> {
    const settings = this._settings

    if (settings === undefined) {
      return
    }

    await Promise.all(
      settings.trackers.map((tracker) => {
        return this.refreshTracker({ trackerId: tracker.id })
      }),
    )
  }

  async refreshTracker(params: { trackerId: string }): Promise<void> {
    const tracker = this._resolveTracker({ trackerId: params.trackerId })

    if (tracker === undefined) {
      return
    }

    this._cancelTrackerTimer({ trackerId: tracker.id })

    const isPollApplied = await this._pollTrackerOnce({ tracker })

    if (isPollApplied) {
      this._scheduleTracker({ tracker })
    }
  }

  onUpdate(params: { listener: UsageUpdateListener }): () => void {
    this._listeners.push(params.listener)

    return () => {
      this._listeners = this._listeners.filter((listener) => {
        return listener !== params.listener
      })
    }
  }

  protected _createDefaultProviders(): Record<ProviderId, IUsageProvider> {
    return { claude: new UsageProviderClaude(), zai: new UsageProviderZai() }
  }

  protected _resolveTracker(params: { trackerId: string }): ITrackerConfig | undefined {
    const settings = this._settings

    if (settings === undefined) {
      return undefined
    }

    return settings.trackers.find((tracker) => {
      return tracker.id === params.trackerId
    })
  }

  protected async _pollTrackerOnce(params: { tracker: ITrackerConfig }): Promise<boolean> {
    const generation = this._beginTrackerPoll({ trackerId: params.tracker.id })
    this._notifyListeners({ snapshot: this._buildSnapshot() })

    const providerSnapshot = await this._pollTracker({ tracker: params.tracker })

    if (generation !== this._generationByTrackerId.get(params.tracker.id)) {
      return false
    }

    this._snapshotByTrackerId.set(params.tracker.id, providerSnapshot)
    this._notifyListeners({ snapshot: this._buildSnapshot() })

    return true
  }

  protected _beginTrackerPoll(params: { trackerId: string }): number {
    const nextGeneration = (this._generationByTrackerId.get(params.trackerId) ?? 0) + 1
    this._generationByTrackerId.set(params.trackerId, nextGeneration)

    return nextGeneration
  }

  protected _buildSnapshot(): IUsageSnapshot {
    const settings = this._settings

    if (settings === undefined) {
      return { providers: [] }
    }

    return {
      providers: settings.trackers.map((tracker) => {
        return this._resolveTrackerSnapshot({ tracker })
      }),
    }
  }

  protected _resolveTrackerSnapshot(params: { tracker: ITrackerConfig }): IProviderSnapshot {
    const existingSnapshot = this._snapshotByTrackerId.get(params.tracker.id)

    if (existingSnapshot !== undefined) {
      return {
        ...existingSnapshot,
        nextRefreshAt: this._nextPollAtByTrackerId.get(params.tracker.id),
      }
    }

    return {
      nextRefreshAt: this._nextPollAtByTrackerId.get(params.tracker.id),
      providerId: params.tracker.providerId,
      status: UsageStatus.PENDING,
      trackerId: params.tracker.id,
      trackerName: params.tracker.name,
    }
  }

  protected async _pollTracker(params: { tracker: ITrackerConfig }): Promise<IProviderSnapshot> {
    const tracker = params.tracker
    const provider = this._providers[tracker.providerId]

    try {
      const accessToken = await this._resolveAccessToken({ tracker })

      if (accessToken === '') {
        return {
          providerId: tracker.providerId,
          status: UsageStatus.UNCONFIGURED,
          trackerId: tracker.id,
          trackerName: tracker.name,
        }
      }

      const usage = await provider.fetchUsage({ accessToken })

      return {
        fetchedAt: Date.now(),
        providerId: tracker.providerId,
        status: UsageStatus.OK,
        trackerId: tracker.id,
        trackerName: tracker.name,
        usage,
      }
    } catch (error) {
      return {
        errorMessage: errorUtil.resolveMessage(error),
        providerId: tracker.providerId,
        status: UsageStatus.ERROR,
        trackerId: tracker.id,
        trackerName: tracker.name,
      }
    }
  }

  protected async _resolveAccessToken(params: { tracker: ITrackerConfig }): Promise<string> {
    if (params.tracker.providerId === 'claude' && params.tracker.tokenSource === ClaudeTokenSource.SYSTEM) {
      return await this._claudeSystemTokenService.resolveAccessToken()
    }

    return params.tracker.accessToken
  }

  protected _scheduleAllTrackers(): void {
    const settings = this._settings

    if (settings === undefined) {
      return
    }

    settings.trackers.forEach((tracker) => {
      this._scheduleTracker({ tracker })
    })
  }

  protected _scheduleTracker(params: { tracker: ITrackerConfig }): void {
    this._cancelTrackerTimer({ trackerId: params.tracker.id })

    const nextPollAt = Date.now() + params.tracker.refreshIntervalSeconds * 1000
    this._nextPollAtByTrackerId.set(params.tracker.id, nextPollAt)

    const timer = setTimeout(() => {
      void this._onTrackerTimer({ tracker: params.tracker })
    }, params.tracker.refreshIntervalSeconds * 1000)

    this._timerByTrackerId.set(params.tracker.id, timer)
  }

  protected async _onTrackerTimer(params: { tracker: ITrackerConfig }): Promise<void> {
    const isPollApplied = await this._pollTrackerOnce({ tracker: params.tracker })

    if (isPollApplied) {
      this._scheduleTracker({ tracker: params.tracker })
    }
  }

  protected _cancelTrackerTimer(params: { trackerId: string }): void {
    const timer = this._timerByTrackerId.get(params.trackerId)

    if (timer === undefined) {
      return
    }

    clearTimeout(timer)
    this._timerByTrackerId.delete(params.trackerId)
  }

  protected _notifyListeners(params: { snapshot: IUsageSnapshot }): void {
    this._listeners.forEach((listener) => {
      listener(params.snapshot)
    })
  }
}
