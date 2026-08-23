import type { ITriggerConfig } from '#src/shared/trigger-model'

export enum ClaudeTokenSource {
  MANUAL = 'manual',
  SYSTEM = 'system',
}

export interface ITrackerConfigBase {
  accessToken: string
  id: string
  isAutoRefreshPaused: boolean
  name: string
  refreshIntervalSeconds: number
}

export interface IClaudeTrackerConfig extends ITrackerConfigBase {
  providerId: 'claude'
  tokenSource: ClaudeTokenSource
}

export interface IZaiTrackerConfig extends ITrackerConfigBase {
  providerId: 'zai'
}

export type ITrackerConfig = IClaudeTrackerConfig | IZaiTrackerConfig

export interface IAppSettings {
  trackers: ITrackerConfig[]
  triggers: ITriggerConfig[]
}

export const MIN_REFRESH_INTERVAL_SECONDS = 60

export const MAX_REFRESH_INTERVAL_SECONDS = 3600

export const MIN_REFRESH_INTERVAL_MINUTES = MIN_REFRESH_INTERVAL_SECONDS / 60

export const MAX_REFRESH_INTERVAL_MINUTES = MAX_REFRESH_INTERVAL_SECONDS / 60
