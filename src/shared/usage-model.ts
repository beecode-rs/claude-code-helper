import type { IAppSettings } from '#src/shared/settings-model'
import type { ISchedulingInfo, ITriggerRegistrationHealth, ITriggerRunLogEntry } from '#src/shared/trigger-model'

export type ProviderId = 'claude' | 'zai'

export const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000

export const SEVEN_DAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export enum UsageStatus {
  ERROR = 'ERROR',
  OK = 'OK',
  PENDING = 'PENDING',
  UNCONFIGURED = 'UNCONFIGURED',
}

export interface IUsageWindow {
  label: string
  resetAt?: number
  totalAmount?: number
  usedAmount?: number
  usedPercent: number
  windowMs?: number
}

export interface IProviderSnapshot {
  errorMessage?: string
  fetchedAt?: number
  nextRefreshAt?: number
  providerId: ProviderId
  status: UsageStatus
  trackerId: string
  trackerName: string
  usage?: IUsageWindow[]
}

export interface IUsageSnapshot {
  providers: IProviderSnapshot[]
}

export type UsageUpdateListener = (snapshot: IUsageSnapshot) => void

export interface IUsageApiClient {
  clearTriggerRunLogs: (params: { triggerId: string }) => Promise<void>
  getSettings: () => Promise<IAppSettings>
  getSchedulingInfo: () => Promise<ISchedulingInfo>
  getSnapshot: () => Promise<IUsageSnapshot>
  getTriggerRunLogs: (params: { triggerId: string }) => Promise<ITriggerRunLogEntry[]>
  inspectTriggerRegistrations: () => Promise<ITriggerRegistrationHealth[]>
  onUsageUpdate: (listener: UsageUpdateListener) => () => void
  refreshNow: () => Promise<void>
  refreshTracker: (params: { trackerId: string }) => Promise<void>
  saveSettings: (settings: IAppSettings) => Promise<IAppSettings>
  setTriggerEnabled: (params: { isEnabled: boolean; triggerId: string }) => Promise<IAppSettings>
  setTrackerPaused: (params: { isAutoRefreshPaused: boolean; trackerId: string }) => Promise<IAppSettings>
}
