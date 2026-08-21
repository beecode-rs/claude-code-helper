import type { IAppSettings } from '#src/shared/settings-model'

export type ProviderId = 'claude' | 'zai'

export enum UsageStatus {
  ERROR = 'ERROR',
  OK = 'OK',
  PENDING = 'PENDING',
  UNCONFIGURED = 'UNCONFIGURED',
}

export interface IUsageWindow {
  estimatedResetAt?: number
  label: string
  usedPercent: number
}

export interface IProviderUsage {
  providerId: ProviderId
  providerName: string
  windows: IUsageWindow[]
}

export interface IProviderSnapshot {
  errorMessage?: string
  fetchedAt?: number
  providerId: ProviderId
  providerName: string
  status: UsageStatus
  usage?: IProviderUsage
}

export interface IUsageSnapshot {
  fetchedAt: number
  providers: IProviderSnapshot[]
}

export type UsageUpdateListener = (snapshot: IUsageSnapshot) => void

export interface IUsageApiClient {
  getSettings: () => Promise<IAppSettings>
  onUsageUpdate: (listener: UsageUpdateListener) => () => void
  refreshNow: () => Promise<void>
  saveSettings: (settings: IAppSettings) => Promise<void>
}
