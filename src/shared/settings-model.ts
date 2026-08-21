export interface IAppSettings {
  claudeAccessToken: string
  pollIntervalSeconds: number
  zaiAccessToken: string
}

export const DEFAULT_POLL_INTERVAL_SECONDS = 60

export const MIN_POLL_INTERVAL_SECONDS = 15

export const MAX_POLL_INTERVAL_SECONDS = 3600
