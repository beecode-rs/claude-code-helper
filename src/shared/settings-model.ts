import type { ITriggerConfig, TriggerDay } from '#src/shared/trigger-model'

export enum ClaudeTokenSource {
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
}

export const LEGACY_CLAUDE_TOKEN_SOURCE_SYSTEM = 'system'

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

export interface IDummyTrackerConfig extends ITrackerConfigBase {
  days: TriggerDay[]
  providerId: 'dummy'
  times: string[]
}

export interface IZaiTrackerConfig extends ITrackerConfigBase {
  providerId: 'zai'
}

export type ITrackerConfig = IClaudeTrackerConfig | IDummyTrackerConfig | IZaiTrackerConfig

export interface ISshHostConfig {
  id: string
  isEnabled: boolean
  url: string
}

export enum SessionSoundId {
  BEEP = 'beep',
  CHIME = 'chime',
  DING = 'ding',
  FANFARE = 'fanfare',
  NONE = 'none',
  PING = 'ping',
  SUCCESS = 'success',
}

export const SESSION_SOUND_IDS: SessionSoundId[] = Object.values(SessionSoundId)

export interface IAppSettings {
  idleSoundId: SessionSoundId
  isSchedulingEnabled: boolean
  isSessionsAutoRefreshPaused: boolean
  sessionsRefreshIntervalSeconds: number
  soundVolumePercent: number
  sshHosts: ISshHostConfig[]
  trackers: ITrackerConfig[]
  triggers: ITriggerConfig[]
  waitingSoundId: SessionSoundId
}

export const DEFAULT_IDLE_SOUND_ID: SessionSoundId = SessionSoundId.SUCCESS

export const DEFAULT_WAITING_SOUND_ID: SessionSoundId = SessionSoundId.CHIME

export const DEFAULT_IS_SCHEDULING_ENABLED = false

export const DEFAULT_IS_SESSIONS_AUTO_REFRESH_PAUSED = false

export const DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS = 5

export const DEFAULT_SOUND_VOLUME_PERCENT = 40

export const MIN_SESSIONS_REFRESH_INTERVAL_SECONDS = 2

export const MAX_SESSIONS_REFRESH_INTERVAL_SECONDS = 300

export const MIN_SOUND_VOLUME_PERCENT = 0

export const MAX_SOUND_VOLUME_PERCENT = 100

export const MIN_REFRESH_INTERVAL_SECONDS = 60

export const MAX_REFRESH_INTERVAL_SECONDS = 3600

export const MIN_REFRESH_INTERVAL_MINUTES = MIN_REFRESH_INTERVAL_SECONDS / 60

export const MAX_REFRESH_INTERVAL_MINUTES = MAX_REFRESH_INTERVAL_SECONDS / 60
