export enum ClaudeTokenSource {
  MANUAL = 'manual',
  SYSTEM = 'system',
}

export interface ITrackerConfigBase {
  accessToken: string
  id: string
  name: string
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
  pollIntervalSeconds: number
  trackers: ITrackerConfig[]
}

export const DEFAULT_POLL_INTERVAL_SECONDS = 300

export const MIN_POLL_INTERVAL_SECONDS = 15

export const MAX_POLL_INTERVAL_SECONDS = 3600
