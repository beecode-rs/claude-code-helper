import { UsageProviderClaude } from '#src/main/business/service/usage-provider/claude'
import { type IUsageProvider } from '#src/main/business/service/usage-provider/usage-provider'
import { UsageProviderZai } from '#src/main/business/service/usage-provider/zai'
import { errorUtil } from '#src/main/util/error-util'
import { type IAppSettings } from '#src/shared/settings-model'
import {
  type IProviderSnapshot,
  type IUsageSnapshot,
  UsageStatus,
  type UsageUpdateListener,
} from '#src/shared/usage-model'

export class UsagePollService {
  protected _intervalId: NodeJS.Timeout | undefined
  protected _listeners: UsageUpdateListener[] = []
  protected readonly _providers: IUsageProvider[]
  protected _settings: IAppSettings | undefined
  protected _snapshot: IUsageSnapshot = { fetchedAt: 0, providers: [] }

  constructor(params?: { providers?: IUsageProvider[] }) {
    const { providers = [new UsageProviderClaude(), new UsageProviderZai()] } = params ?? {}

    this._providers = providers
  }

  async start(params: { settings: IAppSettings }): Promise<void> {
    this._settings = params.settings
    await this.pollNow()
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

    const providerSnapshots = await Promise.all(
      this._providers.map((provider) => {
        return this._pollProvider({ provider, settings })
      }),
    )

    this._snapshot = { fetchedAt: Date.now(), providers: providerSnapshots }
    this._notifyListeners({ snapshot: this._snapshot })
  }

  onUpdate(params: { listener: UsageUpdateListener }): () => void {
    this._listeners.push(params.listener)

    return () => {
      this._listeners = this._listeners.filter((listener) => {
        return listener !== params.listener
      })
    }
  }

  protected async _pollProvider(params: {
    provider: IUsageProvider
    settings: IAppSettings
  }): Promise<IProviderSnapshot> {
    const providerId = params.provider.getProviderId()
    const providerName = params.provider.getProviderName()
    const accessToken = this._resolveAccessToken({ providerId, settings: params.settings })

    if (accessToken === '') {
      return { providerId, providerName, status: UsageStatus.UNCONFIGURED }
    }

    try {
      const usage = await params.provider.fetchUsage({ accessToken })

      return {
        fetchedAt: Date.now(),
        providerId,
        providerName,
        status: UsageStatus.OK,
        usage,
      }
    } catch (error) {
      return {
        errorMessage: errorUtil.resolveMessage(error),
        providerId,
        providerName,
        status: UsageStatus.ERROR,
      }
    }
  }

  protected _resolveAccessToken(params: { providerId: string; settings: IAppSettings }): string {
    switch (params.providerId) {
      case 'claude': {
        return params.settings.claudeAccessToken
      }

      case 'zai': {
        return params.settings.zaiAccessToken
      }

      default: {
        throw new Error(`unsupported provider: ${params.providerId}`)
      }
    }
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
