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
  protected _intervalId: NodeJS.Timeout | undefined
  protected _listeners: UsageUpdateListener[] = []
  protected _pollGeneration = 0
  protected _settings: IAppSettings | undefined
  protected _snapshot: IUsageSnapshot = { fetchedAt: 0, providers: [] }
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

    if (!this._isDevelopment) {
      await this.pollNow()
    }

    this._scheduleNextPoll()
  }

  async restart(params: { settings: IAppSettings }): Promise<void> {
    this.stop()
    await this.start({ settings: params.settings })
  }

  stop(): void {
    if (this._intervalId !== undefined) {
      clearInterval(this._intervalId)
      this._intervalId = undefined
    }
  }

  async pollNow(): Promise<void> {
    const settings = this._settings

    if (settings === undefined) {
      return
    }

    const generation = ++this._pollGeneration
    this._notifyListeners({ snapshot: this._buildPendingSnapshot({ settings }) })

    const providerSnapshots = await Promise.all(
      settings.trackers.map((tracker) => {
        return this._pollTracker({ tracker })
      }),
    )

    if (generation !== this._pollGeneration) {
      return
    }

    this._snapshot = { fetchedAt: Date.now(), providers: providerSnapshots }
    this._notifyListeners({ snapshot: this._snapshot })
  }

  async refreshNow(): Promise<void> {
    await this.pollNow()
    this._scheduleNextPoll()
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

  protected _buildPendingSnapshot(params: { settings: IAppSettings }): IUsageSnapshot {
    return {
      fetchedAt: this._snapshot.fetchedAt,
      providers: params.settings.trackers.map((tracker) => {
        return this._resolvePendingSnapshot({ tracker })
      }),
    }
  }

  protected _resolvePendingSnapshot(params: { tracker: ITrackerConfig }): IProviderSnapshot {
    const previousSnapshot = this._snapshot.providers.find((providerSnapshot) => {
      return providerSnapshot.trackerId === params.tracker.id
    })

    if (previousSnapshot !== undefined) {
      return previousSnapshot
    }

    return {
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

  protected _scheduleNextPoll(): void {
    this.stop()

    const settings = this._settings

    if (settings === undefined) {
      return
    }

    this._intervalId = setInterval(() => {
      void this.pollNow()
    }, settings.pollIntervalSeconds * 1000)
  }

  protected _notifyListeners(params: { snapshot: IUsageSnapshot }): void {
    this._listeners.forEach((listener) => {
      listener(params.snapshot)
    })
  }
}
