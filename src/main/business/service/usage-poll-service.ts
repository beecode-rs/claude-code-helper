import { type UsageSnapshotRepo } from '#src/main/business/repo/usage-snapshot-repo'
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
  protected _generationByTrackerId = new Map<string, number>()
  protected _listeners: UsageUpdateListener[] = []
  protected _nextPollAtByTrackerId = new Map<string, number>()
  protected _settings: IAppSettings | undefined
  protected _snapshotByTrackerId = new Map<string, IProviderSnapshot>()
  protected _timerByTrackerId = new Map<string, NodeJS.Timeout>()
  protected readonly _claudeSystemTokenService: ClaudeSystemTokenService
  protected readonly _providers: Record<ProviderId, IUsageProvider>
  protected readonly _snapshotRepo?: UsageSnapshotRepo

  constructor(params?: {
    claudeSystemTokenService?: ClaudeSystemTokenService
    providers?: Record<ProviderId, IUsageProvider>
    snapshotRepo?: UsageSnapshotRepo
  }) {
    const {
      claudeSystemTokenService = new ClaudeSystemTokenService(),
      providers = this._createDefaultProviders(),
      snapshotRepo,
    } = params ?? {}

    this._claudeSystemTokenService = claudeSystemTokenService
    this._providers = providers
    this._snapshotRepo = snapshotRepo
  }

  async start(params: { settings: IAppSettings }): Promise<void> {
    this._settings = params.settings

    await this._hydratePersistedSnapshots()
    await this._resumeTrackers()
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
      this._scheduleTracker({ delayMs: tracker.refreshIntervalSeconds * 1000, tracker })
    }
  }

  getSnapshot(): IUsageSnapshot {
    return this._buildSnapshot()
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
    this._persistSnapshots()
    this._notifyListeners({ snapshot: this._buildSnapshot() })

    return true
  }

  protected _beginTrackerPoll(params: { trackerId: string }): number {
    const nextGeneration = (this._generationByTrackerId.get(params.trackerId) ?? 0) + 1
    this._generationByTrackerId.set(params.trackerId, nextGeneration)

    return nextGeneration
  }

  protected _buildPersistedSnapshotsByTrackerId(): Record<string, IProviderSnapshot> {
    const settings = this._settings

    if (settings === undefined) {
      return {}
    }

    return settings.trackers.reduce<Record<string, IProviderSnapshot>>((snapshotsByTrackerId, tracker) => {
      const snapshot = this._snapshotByTrackerId.get(tracker.id)

      if (snapshot?.status === UsageStatus.OK) {
        snapshotsByTrackerId[tracker.id] = {
          fetchedAt: snapshot.fetchedAt,
          providerId: snapshot.providerId,
          status: UsageStatus.OK,
          trackerId: snapshot.trackerId,
          trackerName: snapshot.trackerName,
          usage: snapshot.usage,
        }
      }

      return snapshotsByTrackerId
    }, {})
  }

  protected async _hydratePersistedSnapshots(): Promise<void> {
    const snapshotRepo = this._snapshotRepo

    if (snapshotRepo === undefined) {
      return
    }

    const persistedSnapshotsByTrackerId = await snapshotRepo.load()
    const settings = this._settings

    if (settings === undefined) {
      return
    }

    settings.trackers.forEach((tracker) => {
      const persistedSnapshot = persistedSnapshotsByTrackerId[tracker.id]

      if (persistedSnapshot !== undefined) {
        this._snapshotByTrackerId.set(tracker.id, persistedSnapshot)
      }
    })
  }

  protected async _resumeTrackers(): Promise<void> {
    const settings = this._settings

    if (settings === undefined) {
      return
    }

    await Promise.all(
      settings.trackers.map((tracker) => {
        return this._resumeTracker({ tracker })
      }),
    )
  }

  protected async _resumeTracker(params: { tracker: ITrackerConfig }): Promise<void> {
    const resumeDelayMs = this._calcResumeDelayMs({ tracker: params.tracker })

    if (resumeDelayMs > 0) {
      this._scheduleTracker({ delayMs: resumeDelayMs, tracker: params.tracker })

      return
    }

    await this.refreshTracker({ trackerId: params.tracker.id })
  }

  protected _calcResumeDelayMs(params: { tracker: ITrackerConfig }): number {
    const snapshot = this._snapshotByTrackerId.get(params.tracker.id)

    if (snapshot?.fetchedAt === undefined) {
      return 0
    }

    const nextPollAt = snapshot.fetchedAt + params.tracker.refreshIntervalSeconds * 1000
    const resumeDelayMs = nextPollAt - Date.now()

    if (resumeDelayMs <= 0) {
      return 0
    }

    return resumeDelayMs
  }

  protected _persistSnapshots(): void {
    const snapshotRepo = this._snapshotRepo

    if (snapshotRepo === undefined) {
      return
    }

    void snapshotRepo.save({ snapshotsByTrackerId: this._buildPersistedSnapshotsByTrackerId() }).catch(() => {
      return undefined
    })
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

  protected _scheduleTracker(params: { delayMs: number; tracker: ITrackerConfig }): void {
    this._cancelTrackerTimer({ trackerId: params.tracker.id })

    const nextPollAt = Date.now() + params.delayMs
    this._nextPollAtByTrackerId.set(params.tracker.id, nextPollAt)

    const timer = setTimeout(() => {
      void this._onTrackerTimer({ tracker: params.tracker })
    }, params.delayMs)

    this._timerByTrackerId.set(params.tracker.id, timer)
  }

  protected async _onTrackerTimer(params: { tracker: ITrackerConfig }): Promise<void> {
    const isPollApplied = await this._pollTrackerOnce({ tracker: params.tracker })

    if (isPollApplied) {
      this._scheduleTracker({ delayMs: params.tracker.refreshIntervalSeconds * 1000, tracker: params.tracker })
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
