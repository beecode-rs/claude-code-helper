import type { IAppSettings } from '#src/shared/settings-model'

export type ProviderId = 'claude' | 'zai'

export enum UsageStatus {
  ERROR = 'ERROR',
  OK = 'OK',
  PENDING = 'PENDING',
  UNCONFIGURED = 'UNCONFIGURED',
}

export interface IUsageWindow {
  label: string
  resetAt?: number
  usedPercent: number
}

export interface IProviderSnapshot {
  errorMessage?: string
  fetchedAt?: number
  providerId: ProviderId
  status: UsageStatus
  trackerId: string
  trackerName: string
  usage?: IUsageWindow[]
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
  saveSettings: (settings: IAppSettings) => Promise<IAppSettings>
}
